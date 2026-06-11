package com.cupones.service;

import com.cupones.dto.JoinCoupleRequest;
import com.cupones.dto.ProfileResponse;
import com.cupones.exception.BusinessException;
import com.cupones.model.Couple;
import com.cupones.model.Profile;
import com.cupones.repository.CoupleRepository;
import com.cupones.repository.ProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ProfileService {

    private final ProfileRepository profileRepository;
    private final CoupleRepository coupleRepository;

    @Transactional(readOnly = true)
    public ProfileResponse getProfile(UUID userId) {
        Profile profile = profileRepository.findById(userId)
                .orElseThrow(() -> new BusinessException("Perfil no encontrado"));

        return buildProfileResponse(profile);
    }

    @Transactional
    public ProfileResponse joinCouple(UUID userId, JoinCoupleRequest request) {
        if (coupleRepository.findByUserId(userId).isPresent()) {
            throw new BusinessException("Ya tienes una pareja vinculada");
        }

        Profile partner = profileRepository.findByInviteCode(request.getInviteCode().trim())
                .orElseThrow(() -> new BusinessException("Código de invitación inválido"));

        if (partner.getId().equals(userId)) {
            throw new BusinessException("No puedes vincular tu propio código");
        }

        if (coupleRepository.findByUserId(partner.getId()).isPresent()) {
            throw new BusinessException("Esta persona ya tiene pareja vinculada");
        }

        Couple couple = Couple.builder()
                .user1Id(userId.compareTo(partner.getId()) < 0 ? userId : partner.getId())
                .user2Id(userId.compareTo(partner.getId()) < 0 ? partner.getId() : userId)
                .createdAt(Instant.now())
                .build();

        coupleRepository.save(couple);

        return buildProfileResponse(profileRepository.findById(userId).orElseThrow());
    }

    private ProfileResponse buildProfileResponse(Profile profile) {
        ProfileResponse.ProfileResponseBuilder builder = ProfileResponse.builder()
                .id(profile.getId())
                .email(profile.getEmail())
                .displayName(profile.getDisplayName())
                .avatarUrl(profile.getAvatarUrl())
                .inviteCode(profile.getInviteCode())
                .hasCouple(false);

        coupleRepository.findByUserId(profile.getId()).ifPresent(couple -> {
            UUID partnerId = couple.getUser1Id().equals(profile.getId())
                    ? couple.getUser2Id()
                    : couple.getUser1Id();

            profileRepository.findById(partnerId).ifPresent(partner ->
                    builder.hasCouple(true).partner(ProfileResponse.PartnerInfo.builder()
                            .id(partner.getId())
                            .displayName(partner.getDisplayName())
                            .avatarUrl(partner.getAvatarUrl())
                            .build())
            );
        });

        return builder.build();
    }
}
