package com.pollosflow.funds;

import com.pollosflow.audit.AuditService;
import com.pollosflow.common.Role;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class FundIntakeService {
    private final FundIntakeRepository intakes;
    private final FundBatchRepository batches;
    private final AuditService audit;

    public FundIntakeService(FundIntakeRepository intakes, FundBatchRepository batches, AuditService audit) {
        this.intakes = intakes;
        this.batches = batches;
        this.audit = audit;
    }

    @Transactional
    public FundIntake create(FundIntakeDtos.CreateFundIntakeRequest request, Role role) {
        FundIntake intake = new FundIntake();
        intake.setAmount(request.amount());
        intake.setSource(request.source());
        intake.setSplitHours(request.splitHours());
        intake.setCommissionRate(request.commissionRate());
        intake.setRegisteredAt(OffsetDateTime.now());
        intake.setStatus(IntakeStatus.PENDING_OWNER_APPROVAL);
        FundIntake saved = intakes.save(intake);
        split(saved);
        audit.record(role, "FUND_INTAKE_CREATED", "fund_intake", saved.getId(), "Created intake for synthetic training workflow");
        return saved;
    }

    @Transactional
    public FundIntake approve(UUID id, String comment, Role role) {
        FundIntake intake = get(id);
        if (intake.getStatus() != IntakeStatus.PENDING_OWNER_APPROVAL) {
            throw new IllegalStateException("Only pending intake can be approved");
        }
        intake.setStatus(IntakeStatus.APPROVED);
        intake.setOwnerDecisionComment(comment);
        audit.record(role, "FUND_INTAKE_APPROVED", "fund_intake", intake.getId(), "Owner approved intake");
        return intake;
    }

    @Transactional
    public FundIntake reject(UUID id, String comment, Role role) {
        FundIntake intake = get(id);
        if (intake.getStatus() != IntakeStatus.PENDING_OWNER_APPROVAL) {
            throw new IllegalStateException("Only pending intake can be rejected");
        }
        intake.setStatus(IntakeStatus.REJECTED);
        intake.setOwnerDecisionComment(comment);
        audit.record(role, "FUND_INTAKE_REJECTED", "fund_intake", intake.getId(), "Owner rejected intake");
        return intake;
    }

    public FundIntake get(UUID id) {
        return intakes.findById(id).orElseThrow(() -> new IllegalArgumentException("Fund intake not found"));
    }

    public List<FundIntake> list() {
        return intakes.findAll();
    }

    public FundIntakeDtos.FundIntakeResponse toResponse(FundIntake intake) {
        List<FundIntakeDtos.FundBatchResponse> batchResponses = batches.findByIntakeIdOrderBySequenceNo(intake.getId()).stream()
                .map(batch -> new FundIntakeDtos.FundBatchResponse(batch.getId(), batch.getSequenceNo(), batch.getAmount()))
                .toList();
        return new FundIntakeDtos.FundIntakeResponse(
                intake.getId(),
                intake.getAmount(),
                intake.getSource(),
                intake.getSplitHours(),
                intake.getCommissionRate(),
                intake.getRegisteredAt(),
                intake.getStatus(),
                intake.getOwnerDecisionComment(),
                batchResponses);
    }

    private void split(FundIntake intake) {
        int parts = intake.getAmount().compareTo(new BigDecimal("25000")) > 0 ? 4 : 2;
        BigDecimal partAmount = intake.getAmount().divide(BigDecimal.valueOf(parts), 2, RoundingMode.HALF_UP);
        BigDecimal remainder = intake.getAmount();
        for (int i = 1; i <= parts; i++) {
            FundBatch batch = new FundBatch();
            batch.setIntake(intake);
            batch.setSequenceNo(i);
            BigDecimal amount = i == parts ? remainder : partAmount;
            batch.setAmount(amount);
            remainder = remainder.subtract(amount);
            batches.save(batch);
        }
    }
}
