import React from 'react';
import { Avatar, Badge } from 'antd';
import { UserOutlined } from '@ant-design/icons';

const UserAvatar = ({ src, isOnline, size = "default" }) => {
    return (
        // Badge để hiển thị chấm xanh (online) hoặc xám (offline)
        <Badge dot color={isOnline ? 'green' : 'gray'} offset={[-5, 25]}>
            <Avatar src={src} size={size} icon={<UserOutlined />} />
        </Badge>
    );
};

export default UserAvatar;