package com.cupones.controller;

import com.cupones.dto.*;
import com.cupones.service.CouponService;
import com.cupones.service.ProfileService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class ApiController {

    private final ProfileService profileService;
    private final CouponService couponService;

    @GetMapping("/profile")
    public ProfileResponse getProfile(Authentication auth) {
        return profileService.getProfile(getUserId(auth));
    }

    @PostMapping("/couple/join")
    public ProfileResponse joinCouple(Authentication auth, @Valid @RequestBody JoinCoupleRequest request) {
        return profileService.joinCouple(getUserId(auth), request);
    }

    @GetMapping("/coupons")
    public List<CouponResponse> listCoupons(Authentication auth) {
        return couponService.listForUser(getUserId(auth));
    }

    @GetMapping("/coupons/drafts")
    public List<CouponResponse> listDrafts(Authentication auth) {
        return couponService.listMyDrafts(getUserId(auth));
    }

    @PostMapping("/coupons")
    @ResponseStatus(HttpStatus.CREATED)
    public CouponResponse createCoupon(Authentication auth, @Valid @RequestBody CreateCouponRequest request) {
        return couponService.create(getUserId(auth), request);
    }

    @PutMapping("/coupons/{id}")
    public CouponResponse updateCoupon(Authentication auth, @PathVariable UUID id,
                                       @Valid @RequestBody UpdateCouponRequest request) {
        return couponService.update(getUserId(auth), id, request);
    }

    @PostMapping("/coupons/{id}/publish")
    public CouponResponse publishCoupon(Authentication auth, @PathVariable UUID id) {
        return couponService.publish(getUserId(auth), id);
    }

    @PostMapping("/coupons/{id}/redeem")
    public CouponResponse redeemCoupon(Authentication auth, @PathVariable UUID id) {
        return couponService.redeem(getUserId(auth), id);
    }

    private UUID getUserId(Authentication auth) {
        return (UUID) auth.getPrincipal();
    }
}
