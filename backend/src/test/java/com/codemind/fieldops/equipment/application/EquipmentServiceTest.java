package com.codemind.fieldops.equipment.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import com.codemind.fieldops.equipment.domain.Equipment;
import com.codemind.fieldops.equipment.domain.EquipmentStatus;
import com.codemind.fieldops.equipment.repository.EquipmentRepository;
import com.codemind.fieldops.inspection.repository.InspectionRepository;
import com.codemind.fieldops.shared.error.ResourceNotFoundException;
import com.codemind.fieldops.site.application.SiteService;
import com.codemind.fieldops.site.domain.InspectionSite;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

@ExtendWith(MockitoExtension.class)
class EquipmentServiceTest {

    @Mock
    private EquipmentRepository equipmentRepository;

    @Mock
    private InspectionRepository inspectionRepository;

    @Mock
    private SiteService siteService;

    private EquipmentService equipmentService;

    @BeforeEach
    void setUp() {
        equipmentService = new EquipmentService(equipmentRepository, inspectionRepository, siteService);
    }

    private Equipment equipmentWithSite(UUID siteId) {
        InspectionSite site = new InspectionSite();
        site.setId(siteId);
        Equipment equipment = new Equipment();
        equipment.setId(UUID.randomUUID());
        equipment.setSite(site);
        equipment.setStatus(EquipmentStatus.ACTIVE);
        return equipment;
    }

    @Test
    void getByQrCode_adminBypassesScopeCheck() {
        UUID siteId = UUID.randomUUID();
        Equipment equipment = equipmentWithSite(siteId);
        given(equipmentRepository.findByQrCode("QR-001")).willReturn(Optional.of(equipment));

        Equipment result = equipmentService.getByQrCode("QR-001", UUID.randomUUID(), false);

        assertThat(result).isSameAs(equipment);
        verify(inspectionRepository, never()).existsByTechnicianIdAndSiteIdAndStatusNotIn(any(), any(), any());
    }

    @Test
    void getByQrCode_technicianWithActiveInspectionReturnsEquipment() {
        UUID techId = UUID.randomUUID();
        UUID siteId = UUID.randomUUID();
        Equipment equipment = equipmentWithSite(siteId);
        given(equipmentRepository.findByQrCode("QR-001")).willReturn(Optional.of(equipment));
        given(inspectionRepository.existsByTechnicianIdAndSiteIdAndStatusNotIn(
            eq(techId), eq(siteId), any())).willReturn(true);

        Equipment result = equipmentService.getByQrCode("QR-001", techId, true);

        assertThat(result).isSameAs(equipment);
    }

    @Test
    void getByQrCode_technicianWithNoInspectionThrowsAccessDenied() {
        UUID techId = UUID.randomUUID();
        UUID siteId = UUID.randomUUID();
        Equipment equipment = equipmentWithSite(siteId);
        given(equipmentRepository.findByQrCode("QR-001")).willReturn(Optional.of(equipment));
        given(inspectionRepository.existsByTechnicianIdAndSiteIdAndStatusNotIn(
            eq(techId), eq(siteId), any())).willReturn(false);

        assertThatThrownBy(() -> equipmentService.getByQrCode("QR-001", techId, true))
            .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void getByQrCode_nonExistentQrCodeThrowsNotFound() {
        given(equipmentRepository.findByQrCode("NONEXISTENT")).willReturn(Optional.empty());

        assertThatThrownBy(() -> equipmentService.getByQrCode("NONEXISTENT", UUID.randomUUID(), false))
            .isInstanceOf(ResourceNotFoundException.class);
    }

}
