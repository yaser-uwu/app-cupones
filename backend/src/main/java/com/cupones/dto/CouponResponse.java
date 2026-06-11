package com.cupones.dto;

import com.cupones.model.CouponStatus;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
public class CouponResponse {

    private UUID id;
    private UUID creatorId;
    private String creatorName;
    private String title;
    private String description;
    private CouponStatus status;
    private Instant createdAt;
    private Instant publishedAt;
    private Instant redeemedAt;
    private UUID redeemedBy;
    private boolean mine;
    private boolean canEdit;
    private boolean canRedeem;
}
