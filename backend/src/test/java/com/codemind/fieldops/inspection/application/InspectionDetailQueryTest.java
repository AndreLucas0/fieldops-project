package com.codemind.fieldops.inspection.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

import com.codemind.fieldops.inspection.domain.Inspection;
import com.codemind.fieldops.inspection.domain.ItemSnapshot;
import com.codemind.fieldops.inspection.dto.InspectionResponse;
import com.codemind.fieldops.inspection.dto.ItemSnapshotDto;
import com.codemind.fieldops.inspection.mapper.InspectionMapper;
import com.codemind.fieldops.inspection.mapper.InspectionResponseMapper;
import com.codemind.fieldops.inspection.repository.ItemSnapshotRepository;
import com.codemind.fieldops.inspection.repository.InspectionResponseRepository;
import com.codemind.fieldops.nonconformity.mapper.NonConformityMapper;
import com.codemind.fieldops.nonconformity.repository.NonConformityRepository;
import com.codemind.fieldops.review.mapper.InspectionReviewMapper;
import com.codemind.fieldops.review.repository.InspectionReviewRepository;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class InspectionDetailQueryTest {
    @Test
    void returnsPersistedSnapshotWithoutRebuildingItFromMutableTemplate() {
        var service = mock(InspectionService.class);
        var mapper = mock(InspectionMapper.class);
        var snapshots = mock(ItemSnapshotRepository.class);
        var responses = mock(InspectionResponseRepository.class);
        var responseMapper = mock(InspectionResponseMapper.class);
        var nonConformities = mock(NonConformityRepository.class);
        var ncMapper = mock(NonConformityMapper.class);
        var reviews = mock(InspectionReviewRepository.class);
        var reviewMapper = mock(InspectionReviewMapper.class);
        var id = UUID.randomUUID();
        var inspection = mock(Inspection.class);
        var metadata = mock(InspectionResponse.class);
        var snapshot = mock(ItemSnapshot.class);
        var snapshotDto = mock(ItemSnapshotDto.class);
        when(service.getById(id)).thenReturn(inspection);
        when(mapper.toResponse(inspection)).thenReturn(metadata);
        when(snapshots.findByInspectionIdOrderBySectionOrderAscItemOrderAsc(id)).thenReturn(List.of(snapshot));
        when(responseMapper.toSnapshotDto(snapshot)).thenReturn(snapshotDto);
        var query = new InspectionDetailQuery(service, mapper, snapshots, responses, responseMapper,
            nonConformities, ncMapper, reviews, reviewMapper);
        var detail = query.get(id);
        assertThat(detail.inspection()).isSameAs(metadata);
        assertThat(detail.items()).containsExactly(snapshotDto);
        assertThat(detail.responses()).isEmpty();
        assertThat(detail.nonConformities()).isEmpty();
        assertThat(detail.reviews()).isEmpty();
    }
}
