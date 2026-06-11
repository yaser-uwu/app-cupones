package com.cupones.service;

import com.cupones.dto.*;
import com.cupones.exception.BusinessException;
import com.cupones.model.*;
import com.cupones.repository.CoupleRepository;
import com.cupones.repository.CouponRepository;
import com.cupones.repository.ProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CouponService {

    private final CouponRepository couponRepository;
    private final CoupleRepository coupleRepository;
    private final ProfileRepository profileRepository;

    @Transactional
    public CouponResponse create(UUID userId, CreateCouponRequest request) {
        Couple couple = getCoupleForUser(userId);

        Coupon coupon = Coupon.builder()
                .coupleId(couple.getId())
                .creatorId(userId)
                .title(request.getTitle())
                .description(request.getDescription())
                .status(CouponStatus.DRAFT)
                .createdAt(Instant.now())
                .build();

        return toResponse(couponRepository.save(coupon), userId);
    }

    @Transactional
    public CouponResponse update(UUID userId, UUID couponId, UpdateCouponRequest request) {
        Coupon coupon = getCouponForUser(userId, couponId);

        if (coupon.getStatus() != CouponStatus.DRAFT) {
            throw new BusinessException("Solo puedes editar cupones en borrador, antes de publicarlos");
        }
        if (!coupon.getCreatorId().equals(userId)) {
            throw new BusinessException("Solo el creador puede editar este cupón");
        }

        coupon.setTitle(request.getTitle());
        coupon.setDescription(request.getDescription());

        return toResponse(couponRepository.save(coupon), userId);
    }

    @Transactional
    public CouponResponse publish(UUID userId, UUID couponId) {
        Coupon coupon = getCouponForUser(userId, couponId);

        if (coupon.getStatus() != CouponStatus.DRAFT) {
            throw new BusinessException("Solo puedes publicar cupones en borrador");
        }
        if (!coupon.getCreatorId().equals(userId)) {
            throw new BusinessException("Solo el creador puede publicar este cupón");
        }

        coupon.setStatus(CouponStatus.PUBLISHED);
        coupon.setPublishedAt(Instant.now());

        return toResponse(couponRepository.save(coupon), userId);
    }

    @Transactional
    public CouponResponse redeem(UUID userId, UUID couponId) {
        Coupon coupon = getCouponForUser(userId, couponId);

        if (coupon.getStatus() != CouponStatus.PUBLISHED) {
            throw new BusinessException("Este cupón no está disponible para canjear");
        }
        if (coupon.getCreatorId().equals(userId)) {
            throw new BusinessException("No puedes canjear tu propio cupón");
        }

        coupon.setStatus(CouponStatus.REDEEMED);
        coupon.setRedeemedAt(Instant.now());
        coupon.setRedeemedBy(userId);

        return toResponse(couponRepository.save(coupon), userId);
    }

    @Transactional(readOnly = true)
    public List<CouponResponse> listForUser(UUID userId) {
        Couple couple = getCoupleForUser(userId);

        return couponRepository.findByCoupleIdOrderByCreatedAtDesc(couple.getId()).stream()
                .map(c -> toResponse(c, userId))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<CouponResponse> listMyDrafts(UUID userId) {
        Couple couple = getCoupleForUser(userId);

        return couponRepository
                .findByCoupleIdAndCreatorIdAndStatus(couple.getId(), userId, CouponStatus.DRAFT)
                .stream()
                .map(c -> toResponse(c, userId))
                .toList();
    }

    private Coupon getCouponForUser(UUID userId, UUID couponId) {
        Coupon coupon = couponRepository.findById(couponId)
                .orElseThrow(() -> new BusinessException("Cupón no encontrado"));

        getCoupleForUser(userId); // valida que el usuario tiene pareja
        Couple couple = coupleRepository.findByUserId(userId)
                .orElseThrow(() -> new BusinessException("Debes vincular tu pareja primero"));

        if (!coupon.getCoupleId().equals(couple.getId())) {
            throw new BusinessException("No tienes acceso a este cupón");
        }

        return coupon;
    }

    private Couple getCoupleForUser(UUID userId) {
        return coupleRepository.findByUserId(userId)
                .orElseThrow(() -> new BusinessException("Debes vincular tu pareja primero"));
    }

    private CouponResponse toResponse(Coupon coupon, UUID currentUserId) {
        String creatorName = profileRepository.findById(coupon.getCreatorId())
                .map(Profile::getDisplayName)
                .orElse("Desconocido");

        boolean isMine = coupon.getCreatorId().equals(currentUserId);
        boolean canEdit = isMine && coupon.getStatus() == CouponStatus.DRAFT;
        boolean canRedeem = !isMine && coupon.getStatus() == CouponStatus.PUBLISHED;

        return CouponResponse.builder()
                .id(coupon.getId())
                .creatorId(coupon.getCreatorId())
                .creatorName(creatorName)
                .title(coupon.getTitle())
                .description(coupon.getDescription())
                .status(coupon.getStatus())
                .createdAt(coupon.getCreatedAt())
                .publishedAt(coupon.getPublishedAt())
                .redeemedAt(coupon.getRedeemedAt())
                .redeemedBy(coupon.getRedeemedBy())
                .mine(isMine)
                .canEdit(canEdit)
                .canRedeem(canRedeem)
                .build();
    }
}
