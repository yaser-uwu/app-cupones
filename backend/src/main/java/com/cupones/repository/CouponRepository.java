package com.cupones.repository;

import com.cupones.model.Coupon;
import com.cupones.model.CouponStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface CouponRepository extends JpaRepository<Coupon, UUID> {

    List<Coupon> findByCoupleIdOrderByCreatedAtDesc(UUID coupleId);

    List<Coupon> findByCoupleIdAndCreatorIdAndStatus(UUID coupleId, UUID creatorId, CouponStatus status);
}
