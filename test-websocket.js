/**
 * WebSocket Client Test - 测试WebSocket服务器
 */
import WebSocket from 'ws';

const WS_URL = 'ws://localhost:8080/ws';

async function test() {
    console.log('Connecting to WebSocket server...');
    const ws = new WebSocket(WS_URL);

    let messageId = 1;
    const pendingRequests = new Map();

    ws.on('open', () => {
        console.log('Connected to WebSocket server');

        // 测试1: INIT
        sendMessage('INIT', { apiKeys: {} });

        // 测试2: GET_WORKSPACES (2秒后)
        setTimeout(() => {
            sendMessage('GET_WORKSPACES', {});
        }, 2000);

        // 测试3: CREATE_WORKSPACE (4秒后)
        setTimeout(() => {
            sendMessage('CREATE_WORKSPACE', { title: 'Test Workspace' });
        }, 4000);

        // 断开连接 (6秒后)
        setTimeout(() => {
            console.log('Closing connection...');
            ws.close();
            process.exit(0);
        }, 6000);
    });

    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data.toString());
            console.log(`\n[Received] ${message.type}:`, JSON.stringify(message.payload, null, 2));
        } catch (error) {
            console.error('Error parsing message:', error);
        }
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        process.exit(1);
    });

    ws.on('close', () => {
        console.log('\nDisconnected from WebSocket server');
    });

    function sendMessage(type, payload) {
        const id = `test-${messageId++}`;
        const message = {
            id,
            type,
            payload,
            timestamp: Date.now()
        };
        console.log(`\n[Sending] ${type}:`, JSON.stringify(payload));
        ws.send(JSON.stringify(message));
    }
}

test().catch(console.error);