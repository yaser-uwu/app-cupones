package com.cupones.repository;

import com.cupones.model.Couple;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface CoupleRepository extends JpaRepository<Couple, UUID> {

    @Query("SELECT c FROM Couple c WHERE c.user1Id = :userId OR c.user2Id = :userId")
    Optional<Couple> findByUserId(@Param("userId") UUID userId);

    @Query("SELECT CASE WHEN COUNT(c) > 0 THEN true ELSE false END FROM Couple c " +
           "WHERE (c.user1Id = :u1 AND c.user2Id = :u2) OR (c.user1Id = :u2 AND c.user2Id = :u1)")
    boolean existsBetweenUsers(@Param("u1") UUID u1, @Param("u2") UUID u2);
}
