package com.cupones.dto;

import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class ProfileResponse {

    private UUID id;
    private String email;
    private String displayName;
    private String avatarUrl;
    private String inviteCode;
    private boolean hasCouple;
    private PartnerInfo partner;

    @Data
    @Builder
    public static class PartnerInfo {
        private UUID id;
        private String displayName;
        private String avatarUrl;
    }
}
