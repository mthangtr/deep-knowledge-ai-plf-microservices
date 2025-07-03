'use client';

import { useState } from 'react';

export default function DebugChatPage() {
    const [status, setStatus] = useState("Debug page is temporarily disabled.");

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">Chat Debug</h1>
            <p>{status}</p>
        </div>
    );
} 