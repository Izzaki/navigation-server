exports.OutputMessage = class OutputMessage {
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
};
