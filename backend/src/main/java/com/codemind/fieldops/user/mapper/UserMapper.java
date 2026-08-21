package com.codemind.fieldops.user.mapper;

import com.codemind.fieldops.user.domain.User;
import com.codemind.fieldops.user.dto.UserResponse;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface UserMapper {

	UserResponse toResponse(User user);

}
