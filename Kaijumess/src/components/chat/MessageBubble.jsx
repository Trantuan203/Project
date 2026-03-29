import React from 'react';
import { Typography } from 'antd';

const { Text } = Typography;

const MessageBubble = ({ text, isMine, time }) => {
    const bubbleStyle = {
        maxWidth: '70%',
        padding: '10px 14px',
        borderRadius: '16px',
        backgroundColor: isMine ? '#1677ff' : '#ffffff', // Xanh cho mình, trắng cho bạn
        color: isMine ? '#fff' : '#000',
        borderBottomRightRadius: isMine ? '4px' : '16px',
        borderBottomLeftRadius: isMine ? '16px' : '4px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start', marginBottom: '16px' }}>
            <div style={bubbleStyle}>
                <Text style={{ color: 'inherit' }}>{text}</Text>
            </div>
            <Text type="secondary" style={{ fontSize: '12px', marginTop: '4px' }}>{time}</Text>
        </div>
    );
};

export default MessageBubble;