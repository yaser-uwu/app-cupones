package com.cupones.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class JoinCoupleRequest {

    @NotBlank(message = "El código de invitación es obligatorio")
    private String inviteCode;
}
