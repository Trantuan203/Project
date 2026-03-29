import React, { useState } from 'react';
import { Input, Button, Space } from 'antd';
import { SendOutlined, PaperClipOutlined, SmileOutlined } from '@ant-design/icons';

const MessageInput = ({ onSend }) => {
    const [text, setText] = useState('');

    const handleSend = () => {
        if (text.trim()) {
            onSend(text);
            setText('');
        }
    };

    return (
        <div style={{ padding: '16px', borderTop: '1px solid #f0f0f0', backgroundColor: '#fff' }}>
            <Space.Compact style={{ width: '100%' }}>
                <Button icon={<PaperClipOutlined />} size="large" />
                <Input
                    placeholder="Nhập tin nhắn..."
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onPressEnter={handleSend}
                    size="large"
                />
                <Button icon={<SmileOutlined />} size="large" />
                <Button type="primary" icon={<SendOutlined />} onClick={handleSend} size="large" />
            </Space.Compact>
        </div>
    );
};

export default MessageInput;