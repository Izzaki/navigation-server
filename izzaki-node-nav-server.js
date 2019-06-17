const net = require('net');
const colors = require('colors/safe');

let clients = new Set();

class Client {
    constructor(socket) {
        this.socket = socket;
    }

    initialize(id, name, role) {
        this.id = id;
        this.name = name;
        this.role = role;
    }

    updateSerialized(serializedPayload) {
        this.serializedUpdatePayload = serializedPayload;
    }
}

const broadcast = (message, sender) => {
    clients.forEach(client => {
        if (client === sender) return;
        client.socket.write(message);
    });
};

const getSerializedFriends = () => {
    return Array.from(clients).map((client) => [client.id, client.name, client.role].join('|')).join(',');
};

const getSerializedFriendsUpdatePayload = () => {
    return Array.from(clients)
        .map((client) => client.serializedUpdatePayload)
        .join(',');
};

const sortClientsAlphabetically = () => {
    clients = new Set(Array.from(clients).sort((clientA, clientB) => {
        const nameA = clientA.name.toUpperCase();
        const nameB = clientB.name.toUpperCase();
        return (nameA < nameB)
            ? -1
            : (nameA > nameB)
                ? 1
                : 0;
    }));
};

var server = net.createServer(socket => {
    console.log('Somebody connected!');

    const client = new Client(socket);

    socket.on('data', (data) => {
        const msg = new InputMessage();
        msg.setBuffer(data);
        const sizeSummary = msg.getU16();
        const command = msg.getString();
        const parameter = msg.getString();
        const parameter2 = msg.getString();
        const parameter3 = msg.getString();

        // TODO: move to actionManager
        if (command === Commands.INIT) {
            client.initialize(parameter, parameter2, parameter3);
            // in case if init was done again
            if (!clients.has(client)) {
                clients.add(client);
                sortClientsAlphabetically()
            }
            console.log(colors.green('Welcome:'), client.name);

            const outputMessage = new OutputMessage();
            outputMessage.addString(Commands.INIT);
            outputMessage.addString(getSerializedFriends());
            outputMessage.writeMessageSize();
            broadcast(outputMessage.toBuffer(), null);

            const serializedFriends = getSerializedFriends();
            console.log('serializedFriends', serializedFriends);
        } else if (command === Commands.UPDATE) {
            // const serializedPayload = parameter.split('|');
            // const payload = {
            //     level: parameters[0],
            //     healthPercent: parameters[1],
            //     manaPercent: parameters[2],
            //     x: parameters[3],
            //     y: parameters[4],
            //     z: parameters[5],
            // };
            client.updateSerialized(parameter);

            const outputMessage = new OutputMessage();
            outputMessage.addString(Commands.UPDATE);
            outputMessage.addString(getSerializedFriendsUpdatePayload());
            outputMessage.writeMessageSize();
            socket.write(outputMessage.toBuffer());
            return;
        } else if (command === Commands.PING) {
            socket.write(data);
            return;
        } else {
            // leader commands
            broadcast(data, socket);
        }

        // TODO: move to debug()
        // console.log("Received:", data);
        console.log(colors.yellow('Clients:'), clients.size);
        // console.log("Size Summary:", sizeSummary);
        console.log('Command: ' + command);
        console.log('Parameter: ' + parameter);
    });

    socket.on('close', () => {
        console.log(colors.red('Somebody has been disconnected!'));
        clients.delete(client);
        const outputMessage = new OutputMessage();
        outputMessage.addString(Commands.UPDATE);
        outputMessage.addString(getSerializedFriendsUpdatePayload());
        outputMessage.writeMessageSize();
        broadcast(outputMessage);
    });

    socket.on('error', (error) => {
        console.log('socket error', error);
        // clients.delete(client);
        // const outputMessage = new OutputMessage();
        // outputMessage.addString(Commands.UPDATE);
        // outputMessage.addString(getSerializedFriendsUpdatePayload());
        // outputMessage.writeMessageSize();
        // broadcast(outputMessage);
    });
});

server.on('error', (error) => {
    console.log('server error', error);
});
server.listen(8181, '127.0.0.1');
console.log(colors.cyan('Izzaki Navigation Server!\n'));


class InputMessage {
    constructor() {
        this.reset();
    }

    reset() {
        this.m_messageSize = 0;
        this.m_readPos = 0;
        this.m_buffer = [];
    }

    getU8()
    {
        // checkRead(1);
        let v = this.m_buffer[this.m_readPos];
        this.m_readPos += 1;
        return v;
    }

    getU16()
    {
        // checkRead(2);
        let v = this.m_buffer[this.m_readPos] + (this.m_buffer[this.m_readPos+1] << 8);
        this.m_readPos += 2;
        return v;
    }

    getString()
    {
        const stringLength = this.getU16();
        // checkRead(stringLength);
        return this.get(stringLength);
    }

    get(length) {
        const result = this.m_buffer.slice(this.m_readPos, this.m_readPos + length).toString();
        this.m_readPos += length;
        return result;
    }

    setBuffer(buffer)
    {
        let length = buffer.length;
        this.reset();
        // checkWrite(len);
        this.m_buffer = buffer;
        this.m_messageSize = length;
    }
}

class OutputMessage {
    constructor() {
        this.reset();
    }

    reset() {
        this.m_writePos = 2;
        this.m_messageSize = 2;
        this.m_buffer = Buffer.alloc(4096); // BE CAREFUL. OUTPUT MESSAGE CAN BE TRUNCATED SO SOME BUGS WILL OCCUR!!!!
    }

    addU8(value) {
        // checkWrite(2);
        this.m_buffer.writeUInt8(value, this.m_writePos);
        this.m_writePos += 1;
        this.m_messageSize += 1;
    }

    addU16(value) {
        // checkWrite(2);
        this.m_buffer.writeUInt16LE(value, this.m_writePos);
        this.m_writePos += 2;
        this.m_messageSize += 2;
    }

    addString(value)
    {
        const length = value.length;
        this.addU16(length);
        this.m_buffer.write(value, this.m_writePos, length);
        this.m_writePos += length;
        this.m_messageSize += length;
    }

    toBuffer() {
        return Buffer.alloc(this.m_messageSize, this.m_buffer);
    }

    writeMessageSize()
    {
        this.m_buffer.writeUInt16LE(this.m_messageSize - 2, 0);
    }
}


const Commands = {
    INIT: 'init',
    UPDATE: 'update',
    PING: 'ping',
    STATUS: 'status'
};







// // TEST
// const outputMessage = new OutputMessage();
// outputMessage.addString('ff');
// outputMessage.addString('ee');
// outputMessage.writeMessageSize();
// console.log('buffer -->', outputMessage.toBuffer());
//
//
// const inputMessage = new InputMessage();
// inputMessage.setBuffer(outputMessage.toBuffer());
//
// console.log('inputMessage -->',
//     inputMessage.getU16(),
//     inputMessage.getString(),
//     inputMessage.getString()
// );
