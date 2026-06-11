import { supabase } from './supabase';
import { withRetry } from './retry';

export const COUPONS_PAGE_SIZE = 30;

export interface PartnerInfo {
  id: string;
  displayName: string;
  avatarUrl?: string;
}

export interface Profile {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  inviteCode: string;
  hasCouple: boolean;
  coupleId?: string;
  partner?: PartnerInfo;
}

export type CouponStatus = 'DRAFT' | 'PUBLISHED' | 'REDEEMED';

export interface Coupon {
  id: string;
  creatorId: string;
  creatorName: string;
  title: string;
  description?: string;
  status: CouponStatus;
  createdAt: string;
  publishedAt?: string;
  redeemedAt?: string;
  redeemedBy?: string;
  mine: boolean;
  canEdit: boolean;
  canRedeem: boolean;
}

export interface AppNotification {
  id: string;
  type: 'coupon_published' | 'coupon_redeemed';
  title: string;
  body: string;
  couponId?: string;
  readAt?: string;
  createdAt: string;
}

export interface CouponsPage {
  coupons: Coupon[];
  hasMore: boolean;
}

type DbProfile = {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  invite_code: string;
};

type DbCoupon = {
  id: string;
  couple_id: string;
  creator_id: string;
  title: string;
  description: string | null;
  status: CouponStatus;
  created_at: string;
  published_at: string | null;
  redeemed_at: string | null;
  redeemed_by: string | null;
};

type DbCouple = {
  id: string;
  user1_id: string;
  user2_id: string;
};

function throwIfError(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

async function getCurrentUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');
  return user.id;
}

async function getCouple(userId: string): Promise<DbCouple | null> {
  const { data, error } = await supabase
    .from('couples')
    .select('*')
    .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
    .maybeSingle();

  throwIfError(error);
  return data;
}

function mapProfile(
  row: DbProfile,
  partner?: DbProfile | null,
  hasCouple = false,
  coupleId?: string,
): Profile {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name ?? row.email.split('@')[0],
    avatarUrl: row.avatar_url ?? undefined,
    inviteCode: row.invite_code,
    hasCouple,
    coupleId,
    partner: partner
      ? {
          id: partner.id,
          displayName: partner.display_name ?? partner.email.split('@')[0],
          avatarUrl: partner.avatar_url ?? undefined,
        }
      : undefined,
  };
}

type DbNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  coupon_id: string | null;
  read_at: string | null;
  created_at: string;
};

async function mapCouponsPage(
  rows: DbCoupon[],
  userId: string,
  hasMore: boolean,
): Promise<CouponsPage> {
  const creatorIds = [...new Set(rows.map((c) => c.creator_id))];
  const { data: creators } = creatorIds.length
    ? await supabase.from('profiles').select('id, display_name, email').in('id', creatorIds)
    : { data: [] };

  const nameMap = new Map(
    (creators ?? []).map((p: { id: string; display_name: string | null; email: string }) => [
      p.id,
      p.display_name ?? p.email.split('@')[0],
    ]),
  );

  const coupons = await Promise.all(
    rows.map((c) => mapCoupon(c, userId, nameMap.get(c.creator_id) ?? 'Desconocido')),
  );

  return { coupons, hasMore };
}

async function mapCoupon(row: DbCoupon, userId: string, creatorName: string): Promise<Coupon> {
  const isMine = row.creator_id === userId;
  return {
    id: row.id,
    creatorId: row.creator_id,
    creatorName,
    title: row.title,
    description: row.description ?? undefined,
    status: row.status,
    createdAt: row.created_at,
    publishedAt: row.published_at ?? undefined,
    redeemedAt: row.redeemed_at ?? undefined,
    redeemedBy: row.redeemed_by ?? undefined,
    mine: isMine,
    canEdit: isMine && row.status === 'DRAFT',
    canRedeem: !isMine && row.status === 'PUBLISHED',
  };
}

function mapNotification(row: DbNotification): AppNotification {
  return {
    id: row.id,
    type: row.type as AppNotification['type'],
    title: row.title,
    body: row.body,
    couponId: row.coupon_id ?? undefined,
    readAt: row.read_at ?? undefined,
    createdAt: row.created_at,
  };
}

export const api = {
  async getProfile(): Promise<Profile> {
    const userId = await getCurrentUserId();

    // Crea el perfil si no existe (p. ej. login antes de ejecutar el SQL)
    const { data: profile, error } = await supabase.rpc('ensure_my_profile');
    if (error) {
      // Fallback si aún no ejecutaron la migración 003
      const { data: existing, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      throwIfError(fetchError);
      if (!existing) throw new Error('Perfil no encontrado. Ejecuta supabase/migrations/003_ensure_profile.sql en Supabase.');
      return this.buildProfileResponse(existing, userId);
    }

    return this.buildProfileResponse(profile, userId);
  },

  async buildProfileResponse(profile: DbProfile, userId: string): Promise<Profile> {
    const couple = await getCouple(userId);
    if (!couple) return mapProfile(profile);

    const partnerId = couple.user1_id === userId ? couple.user2_id : couple.user1_id;
    const { data: partner } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', partnerId)
      .single();

    return mapProfile(profile, partner, true, couple.id);
  },

  async joinCouple(inviteCode: string): Promise<Profile> {
    const { error } = await supabase.rpc('join_couple', { p_invite_code: inviteCode });
    throwIfError(error);
    return this.getProfile();
  },

  async getCoupons(page = 0): Promise<CouponsPage> {
    return withRetry(async () => {
      const userId = await getCurrentUserId();
      const couple = await getCouple(userId);
      if (!couple) throw new Error('Debes vincular tu pareja primero');

      const from = page * COUPONS_PAGE_SIZE;
      const to = from + COUPONS_PAGE_SIZE;

      const { data: coupons, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('couple_id', couple.id)
        .order('created_at', { ascending: false })
        .range(from, to);

      throwIfError(error);

      const rows = (coupons ?? []) as DbCoupon[];
      const hasMore = rows.length > COUPONS_PAGE_SIZE;
      const slice = hasMore ? rows.slice(0, COUPONS_PAGE_SIZE) : rows;

      return mapCouponsPage(slice, userId, hasMore);
    });
  },

  async getNotifications(limit = 30): Promise<AppNotification[]> {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    throwIfError(error);
    return (data ?? []).map(mapNotification);
  },

  async getUnreadCount(): Promise<number> {
    const userId = await getCurrentUserId();
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('read_at', null);

    throwIfError(error);
    return count ?? 0;
  },

  async markNotificationRead(id: string): Promise<void> {
    const userId = await getCurrentUserId();
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId);

    throwIfError(error);
  },

  async markAllNotificationsRead(): Promise<void> {
    const userId = await getCurrentUserId();
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .is('read_at', null);

    throwIfError(error);
  },

  async createCoupon(title: string, description?: string): Promise<Coupon> {
    const userId = await getCurrentUserId();
    const couple = await getCouple(userId);
    if (!couple) throw new Error('Debes vincular tu pareja primero');

    const { data, error } = await supabase
      .from('coupons')
      .insert({
        couple_id: couple.id,
        creator_id: userId,
        title,
        description: description ?? null,
        status: 'DRAFT',
      })
      .select('*')
      .single();

    throwIfError(error);

    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, email')
      .eq('id', userId)
      .single();

    const creatorName = profile?.display_name ?? profile?.email?.split('@')[0] ?? 'Tú';
    return mapCoupon(data, userId, creatorName);
  },

  async updateCoupon(id: string, title: string, description?: string): Promise<Coupon> {
    const userId = await getCurrentUserId();

    const { data, error } = await supabase
      .from('coupons')
      .update({ title, description: description ?? null })
      .eq('id', id)
      .eq('creator_id', userId)
      .eq('status', 'DRAFT')
      .select('*')
      .single();

    throwIfError(error);

    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, email')
      .eq('id', userId)
      .single();

    const creatorName = profile?.display_name ?? profile?.email?.split('@')[0] ?? 'Tú';
    return mapCoupon(data, userId, creatorName);
  },

  async publishCoupon(id: string): Promise<Coupon> {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase.rpc('publish_coupon', { p_coupon_id: id });
    throwIfError(error);

    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, email')
      .eq('id', userId)
      .single();

    const creatorName = profile?.display_name ?? profile?.email?.split('@')[0] ?? 'Tú';
    return mapCoupon(data, userId, creatorName);
  },

  async redeemCoupon(id: string): Promise<Coupon> {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase.rpc('redeem_coupon', { p_coupon_id: id });
    throwIfError(error);

    const { data: creator } = await supabase
      .from('profiles')
      .select('display_name, email')
      .eq('id', data.creator_id)
      .single();

    const creatorName = creator?.display_name ?? creator?.email?.split('@')[0] ?? 'Desconocido';
    return mapCoupon(data, userId, creatorName);
  },

  async leaveCouple(): Promise<void> {
    const { error } = await supabase.rpc('leave_couple');
    throwIfError(error);
  },
};
