const TaskType = {
    DECODE_PNG: 1,
    DECODE_JPG: 2
}

onmessage = function (e) {
    e.data[2].push(function (err, data) {
        if (!err) {
            postMessage([e.data[0], [err, data]], [data.data.buffer]);
        }
        else {
            postMessage([e.data[0], [err.message, null]]);
        }
    });
    var parameters = e.data[2];
    switch (e.data[1]) {
        case TaskType.DECODE_PNG:
            PNG.load.apply(this, parameters);
            break;
        case TaskType.DECODE_JPG:
            JPEG.load.apply(this, parameters);
            break;
        default:
            postMessage([e.data[0], [null, null]]);
            
    }
}


function loadURLasArrayBuffer(path, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", path, true);
    xhr.responseType = "arraybuffer";
    xhr.onload = function() {
        callback(null, xhr.response || xhr.mozResponseArrayBuffer);
    };

    xhr.onerror = function (e) {
        callback(e, null);
    };

    xhr.send(null);
}

function clamp0to255(a) {
    return a <= 0 ? 0 : a >= 255 ? 255 : a;
}

// https://github.com/devongovett/png.js
var PNG = (function() {
    var FlateStream = (function() {
        var codeLenCodeMap = new Uint32Array([
            16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15
        ]);
    
        var lengthDecode = new Uint32Array([
            0x00003, 0x00004, 0x00005, 0x00006, 0x00007, 0x00008, 0x00009, 0x0000a,
            0x1000b, 0x1000d, 0x1000f, 0x10011, 0x20013, 0x20017, 0x2001b, 0x2001f,
            0x30023, 0x3002b, 0x30033, 0x3003b, 0x40043, 0x40053, 0x40063, 0x40073,
            0x50083, 0x500a3, 0x500c3, 0x500e3, 0x00102, 0x00102, 0x00102
        ]);
    
        var distDecode = new Uint32Array([
            0x00001, 0x00002, 0x00003, 0x00004, 0x10005, 0x10007, 0x20009, 0x2000d,
            0x30011, 0x30019, 0x40021, 0x40031, 0x50041, 0x50061, 0x60081, 0x600c1,
            0x70101, 0x70181, 0x80201, 0x80301, 0x90401, 0x90601, 0xa0801, 0xa0c01,
            0xb1001, 0xb1801, 0xc2001, 0xc3001, 0xd4001, 0xd6001
        ]);
    
        var fixedLitCodeTab = [new Uint32Array([
            0x70100, 0x80050, 0x80010, 0x80118, 0x70110, 0x80070, 0x80030, 0x900c0,
            0x70108, 0x80060, 0x80020, 0x900a0, 0x80000, 0x80080, 0x80040, 0x900e0,
            0x70104, 0x80058, 0x80018, 0x90090, 0x70114, 0x80078, 0x80038, 0x900d0,
            0x7010c, 0x80068, 0x80028, 0x900b0, 0x80008, 0x80088, 0x80048, 0x900f0,
            0x70102, 0x80054, 0x80014, 0x8011c, 0x70112, 0x80074, 0x80034, 0x900c8,
            0x7010a, 0x80064, 0x80024, 0x900a8, 0x80004, 0x80084, 0x80044, 0x900e8,
            0x70106, 0x8005c, 0x8001c, 0x90098, 0x70116, 0x8007c, 0x8003c, 0x900d8,
            0x7010e, 0x8006c, 0x8002c, 0x900b8, 0x8000c, 0x8008c, 0x8004c, 0x900f8,
            0x70101, 0x80052, 0x80012, 0x8011a, 0x70111, 0x80072, 0x80032, 0x900c4,
            0x70109, 0x80062, 0x80022, 0x900a4, 0x80002, 0x80082, 0x80042, 0x900e4,
            0x70105, 0x8005a, 0x8001a, 0x90094, 0x70115, 0x8007a, 0x8003a, 0x900d4,
            0x7010d, 0x8006a, 0x8002a, 0x900b4, 0x8000a, 0x8008a, 0x8004a, 0x900f4,
            0x70103, 0x80056, 0x80016, 0x8011e, 0x70113, 0x80076, 0x80036, 0x900cc,
            0x7010b, 0x80066, 0x80026, 0x900ac, 0x80006, 0x80086, 0x80046, 0x900ec,
            0x70107, 0x8005e, 0x8001e, 0x9009c, 0x70117, 0x8007e, 0x8003e, 0x900dc,
            0x7010f, 0x8006e, 0x8002e, 0x900bc, 0x8000e, 0x8008e, 0x8004e, 0x900fc,
            0x70100, 0x80051, 0x80011, 0x80119, 0x70110, 0x80071, 0x80031, 0x900c2,
            0x70108, 0x80061, 0x80021, 0x900a2, 0x80001, 0x80081, 0x80041, 0x900e2,
            0x70104, 0x80059, 0x80019, 0x90092, 0x70114, 0x80079, 0x80039, 0x900d2,
            0x7010c, 0x80069, 0x80029, 0x900b2, 0x80009, 0x80089, 0x80049, 0x900f2,
            0x70102, 0x80055, 0x80015, 0x8011d, 0x70112, 0x80075, 0x80035, 0x900ca,
            0x7010a, 0x80065, 0x80025, 0x900aa, 0x80005, 0x80085, 0x80045, 0x900ea,
            0x70106, 0x8005d, 0x8001d, 0x9009a, 0x70116, 0x8007d, 0x8003d, 0x900da,
            0x7010e, 0x8006d, 0x8002d, 0x900ba, 0x8000d, 0x8008d, 0x8004d, 0x900fa,
            0x70101, 0x80053, 0x80013, 0x8011b, 0x70111, 0x80073, 0x80033, 0x900c6,
            0x70109, 0x80063, 0x80023, 0x900a6, 0x80003, 0x80083, 0x80043, 0x900e6,
            0x70105, 0x8005b, 0x8001b, 0x90096, 0x70115, 0x8007b, 0x8003b, 0x900d6,
            0x7010d, 0x8006b, 0x8002b, 0x900b6, 0x8000b, 0x8008b, 0x8004b, 0x900f6,
            0x70103, 0x80057, 0x80017, 0x8011f, 0x70113, 0x80077, 0x80037, 0x900ce,
            0x7010b, 0x80067, 0x80027, 0x900ae, 0x80007, 0x80087, 0x80047, 0x900ee,
            0x70107, 0x8005f, 0x8001f, 0x9009e, 0x70117, 0x8007f, 0x8003f, 0x900de,
            0x7010f, 0x8006f, 0x8002f, 0x900be, 0x8000f, 0x8008f, 0x8004f, 0x900fe,
            0x70100, 0x80050, 0x80010, 0x80118, 0x70110, 0x80070, 0x80030, 0x900c1,
            0x70108, 0x80060, 0x80020, 0x900a1, 0x80000, 0x80080, 0x80040, 0x900e1,
            0x70104, 0x80058, 0x80018, 0x90091, 0x70114, 0x80078, 0x80038, 0x900d1,
            0x7010c, 0x80068, 0x80028, 0x900b1, 0x80008, 0x80088, 0x80048, 0x900f1,
            0x70102, 0x80054, 0x80014, 0x8011c, 0x70112, 0x80074, 0x80034, 0x900c9,
            0x7010a, 0x80064, 0x80024, 0x900a9, 0x80004, 0x80084, 0x80044, 0x900e9,
            0x70106, 0x8005c, 0x8001c, 0x90099, 0x70116, 0x8007c, 0x8003c, 0x900d9,
            0x7010e, 0x8006c, 0x8002c, 0x900b9, 0x8000c, 0x8008c, 0x8004c, 0x900f9,
            0x70101, 0x80052, 0x80012, 0x8011a, 0x70111, 0x80072, 0x80032, 0x900c5,
            0x70109, 0x80062, 0x80022, 0x900a5, 0x80002, 0x80082, 0x80042, 0x900e5,
            0x70105, 0x8005a, 0x8001a, 0x90095, 0x70115, 0x8007a, 0x8003a, 0x900d5,
            0x7010d, 0x8006a, 0x8002a, 0x900b5, 0x8000a, 0x8008a, 0x8004a, 0x900f5,
            0x70103, 0x80056, 0x80016, 0x8011e, 0x70113, 0x80076, 0x80036, 0x900cd,
            0x7010b, 0x80066, 0x80026, 0x900ad, 0x80006, 0x80086, 0x80046, 0x900ed,
            0x70107, 0x8005e, 0x8001e, 0x9009d, 0x70117, 0x8007e, 0x8003e, 0x900dd,
            0x7010f, 0x8006e, 0x8002e, 0x900bd, 0x8000e, 0x8008e, 0x8004e, 0x900fd,
            0x70100, 0x80051, 0x80011, 0x80119, 0x70110, 0x80071, 0x80031, 0x900c3,
            0x70108, 0x80061, 0x80021, 0x900a3, 0x80001, 0x80081, 0x80041, 0x900e3,
            0x70104, 0x80059, 0x80019, 0x90093, 0x70114, 0x80079, 0x80039, 0x900d3,
            0x7010c, 0x80069, 0x80029, 0x900b3, 0x80009, 0x80089, 0x80049, 0x900f3,
            0x70102, 0x80055, 0x80015, 0x8011d, 0x70112, 0x80075, 0x80035, 0x900cb,
            0x7010a, 0x80065, 0x80025, 0x900ab, 0x80005, 0x80085, 0x80045, 0x900eb,
            0x70106, 0x8005d, 0x8001d, 0x9009b, 0x70116, 0x8007d, 0x8003d, 0x900db,
            0x7010e, 0x8006d, 0x8002d, 0x900bb, 0x8000d, 0x8008d, 0x8004d, 0x900fb,
            0x70101, 0x80053, 0x80013, 0x8011b, 0x70111, 0x80073, 0x80033, 0x900c7,
            0x70109, 0x80063, 0x80023, 0x900a7, 0x80003, 0x80083, 0x80043, 0x900e7,
            0x70105, 0x8005b, 0x8001b, 0x90097, 0x70115, 0x8007b, 0x8003b, 0x900d7,
            0x7010d, 0x8006b, 0x8002b, 0x900b7, 0x8000b, 0x8008b, 0x8004b, 0x900f7,
            0x70103, 0x80057, 0x80017, 0x8011f, 0x70113, 0x80077, 0x80037, 0x900cf,
            0x7010b, 0x80067, 0x80027, 0x900af, 0x80007, 0x80087, 0x80047, 0x900ef,
            0x70107, 0x8005f, 0x8001f, 0x9009f, 0x70117, 0x8007f, 0x8003f, 0x900df,
            0x7010f, 0x8006f, 0x8002f, 0x900bf, 0x8000f, 0x8008f, 0x8004f, 0x900ff
        ]), 9];
    
        var fixedDistCodeTab = [new Uint32Array([
            0x50000, 0x50010, 0x50008, 0x50018, 0x50004, 0x50014, 0x5000c, 0x5001c,
            0x50002, 0x50012, 0x5000a, 0x5001a, 0x50006, 0x50016, 0x5000e, 0x00000,
            0x50001, 0x50011, 0x50009, 0x50019, 0x50005, 0x50015, 0x5000d, 0x5001d,
            0x50003, 0x50013, 0x5000b, 0x5001b, 0x50007, 0x50017, 0x5000f, 0x00000
        ]), 5];
        
        function error(e) {
            throw new Error(e)
        }
    
        function constructor(bytes) {
            //var bytes = stream.getBytes();
            var bytesPos = 0;
        
            var cmf = bytes[bytesPos++];
            var flg = bytes[bytesPos++];
            if (cmf == -1 || flg == -1)
                error('Invalid header in flate stream');
            if ((cmf & 0x0f) != 0x08)
                error('Unknown compression method in flate stream');
            if ((((cmf << 8) + flg) % 31) != 0)
                error('Bad FCHECK in flate stream');
            if (flg & 0x20)
                error('FDICT bit set in flate stream');
        
            this.bytes = bytes;
            this.bytesPos = bytesPos;
        
            this.codeSize = 0;
            this.codeBuf = 0;
        
            this.pos = 0;
            this.bufferLength = 0;
            this.eof = false;
            this.buffer = null;
        }

        constructor.prototype.ensureBuffer = function (requested) {
            var buffer = this.buffer;
            var current = buffer ? buffer.byteLength : 0;
            if (requested < current)
                return buffer;
            var size = 512;
            while (size < requested)
                size <<= 1;
            var buffer2 = new Uint8Array(size);
            for (var i = 0; i < current; ++i)
                buffer2[i] = buffer[i];
            return this.buffer = buffer2;
        };

        constructor.prototype.getBytes = function (length) {
            var pos = this.pos;
    
            if (length) {
                this.ensureBuffer(pos + length);
                var end = pos + length;
        
                while (!this.eof && this.bufferLength < end)
                    this.readBlock();
        
                var bufEnd = this.bufferLength;
                if (end > bufEnd)
                    end = bufEnd;
            } else {
                while (!this.eof)
                    this.readBlock();
    
                var end = this.bufferLength;
            }
    
            this.pos = end;
            return this.buffer.subarray(pos, end);
        };

        constructor.prototype.getBits = function(bits) {
            var codeSize = this.codeSize;
            var codeBuf = this.codeBuf;
            var bytes = this.bytes;
            var bytesPos = this.bytesPos;
        
            var b;
            while (codeSize < bits) {
                if (typeof (b = bytes[bytesPos++]) == 'undefined')
                    error('Bad encoding in flate stream');
                codeBuf |= b << codeSize;
                codeSize += 8;
            }
            b = codeBuf & ((1 << bits) - 1);
            this.codeBuf = codeBuf >> bits;
            this.codeSize = codeSize -= bits;
            this.bytesPos = bytesPos;
            return b;
        };
    
        constructor.prototype.getCode = function(table) {
            var codes = table[0];
            var maxLen = table[1];
            var codeSize = this.codeSize;
            var codeBuf = this.codeBuf;
            var bytes = this.bytes;
            var bytesPos = this.bytesPos;
        
            while (codeSize < maxLen) {
                var b;
                if (typeof (b = bytes[bytesPos++]) == 'undefined')
                    error('Bad encoding in flate stream');
                codeBuf |= (b << codeSize);
                codeSize += 8;
            }
            var code = codes[codeBuf & ((1 << maxLen) - 1)];
            var codeLen = code >> 16;
            var codeVal = code & 0xffff;
            if (codeSize == 0 || codeSize < codeLen || codeLen == 0)
                error('Bad encoding in flate stream');
            this.codeBuf = (codeBuf >> codeLen);
            this.codeSize = (codeSize - codeLen);
            this.bytesPos = bytesPos;
            return codeVal;
        };
    
        constructor.prototype.generateHuffmanTable = function(lengths) {
            var n = lengths.length;
        
            // find max code length
            var maxLen = 0;
            for (var i = 0; i < n; ++i) {
                if (lengths[i] > maxLen)
                maxLen = lengths[i];
            }
        
            // build the table
            var size = 1 << maxLen;
            var codes = new Uint32Array(size);
            for (var len = 1, code = 0, skip = 2;
                len <= maxLen;
                ++len, code <<= 1, skip <<= 1) {
                for (var val = 0; val < n; ++val) {
                    if (lengths[val] == len) {
                        // bit-reverse the code
                        var code2 = 0;
                        var t = code;
                        for (var i = 0; i < len; ++i) {
                        code2 = (code2 << 1) | (t & 1);
                        t >>= 1;
                        }
            
                        // fill the table entries
                        for (var i = code2; i < size; i += skip)
                        codes[i] = (len << 16) | val;
            
                        ++code;
                    }
                }
            }
        
            return [codes, maxLen];
        };
    
        constructor.prototype.readBlock = function() {
            function repeat(stream, array, len, offset, what) {
                var repeat = stream.getBits(len) + offset;
                while (repeat-- > 0)
                array[i++] = what;
            }
    
            // read block header
            var hdr = this.getBits(3);
            if (hdr & 1)
                this.eof = true;
            hdr >>= 1;
        
            if (hdr == 0) { // uncompressed block
                var bytes = this.bytes;
                var bytesPos = this.bytesPos;
                var b;
        
                if (typeof (b = bytes[bytesPos++]) == 'undefined')
                    error('Bad block header in flate stream');
                var blockLen = b;
                if (typeof (b = bytes[bytesPos++]) == 'undefined')
                    error('Bad block header in flate stream');
                blockLen |= (b << 8);
                if (typeof (b = bytes[bytesPos++]) == 'undefined')
                    error('Bad block header in flate stream');
                var check = b;
                if (typeof (b = bytes[bytesPos++]) == 'undefined')
                    error('Bad block header in flate stream');
                check |= (b << 8);
                if (check != (~blockLen & 0xffff))
                    error('Bad uncompressed block length in flate stream');
        
                this.codeBuf = 0;
                this.codeSize = 0;
        
                var bufferLength = this.bufferLength;
                var buffer = this.ensureBuffer(bufferLength + blockLen);
                var end = bufferLength + blockLen;
                this.bufferLength = end;
                for (var n = bufferLength; n < end; ++n) {
                    if (typeof (b = bytes[bytesPos++]) == 'undefined') {
                        this.eof = true;
                        break;
                    }
                    buffer[n] = b;
                }
                this.bytesPos = bytesPos;
                return;
            }
    
            var litCodeTable;
            var distCodeTable;
            if (hdr == 1) { // compressed block, fixed codes
                litCodeTable = fixedLitCodeTab;
                distCodeTable = fixedDistCodeTab;
            } else if (hdr == 2) { // compressed block, dynamic codes
                var numLitCodes = this.getBits(5) + 257;
                var numDistCodes = this.getBits(5) + 1;
                var numCodeLenCodes = this.getBits(4) + 4;
        
                // build the code lengths code table
                var codeLenCodeLengths = Array(codeLenCodeMap.length);
                var i = 0;
                while (i < numCodeLenCodes)
                    codeLenCodeLengths[codeLenCodeMap[i++]] = this.getBits(3);
                var codeLenCodeTab = this.generateHuffmanTable(codeLenCodeLengths);
        
                // build the literal and distance code tables
                var len = 0;
                var i = 0;
                var codes = numLitCodes + numDistCodes;
                var codeLengths = new Array(codes);
                while (i < codes) {
                    var code = this.getCode(codeLenCodeTab);
                    if (code == 16) {
                        repeat(this, codeLengths, 2, 3, len);
                    } else if (code == 17) {
                        repeat(this, codeLengths, 3, 3, len = 0);
                    } else if (code == 18) {
                        repeat(this, codeLengths, 7, 11, len = 0);
                    } else {
                        codeLengths[i++] = len = code;
                    }
                }
        
                litCodeTable =
                    this.generateHuffmanTable(codeLengths.slice(0, numLitCodes));
                distCodeTable =
                    this.generateHuffmanTable(codeLengths.slice(numLitCodes, codes));
            } else {
                error('Unknown block type in flate stream');
            }
    
            var buffer = this.buffer;
            var limit = buffer ? buffer.length : 0;
            var pos = this.bufferLength;
            while (true) {
                var code1 = this.getCode(litCodeTable);
                if (code1 < 256) {
                    if (pos + 1 >= limit) {
                        buffer = this.ensureBuffer(pos + 1);
                        limit = buffer.length;
                    }
                    buffer[pos++] = code1;
                    continue;
                }
                if (code1 == 256) {
                    this.bufferLength = pos;
                    return;
                }
                code1 -= 257;
                code1 = lengthDecode[code1];
                var code2 = code1 >> 16;
                if (code2 > 0)
                    code2 = this.getBits(code2);
                var len = (code1 & 0xffff) + code2;
                code1 = this.getCode(distCodeTable);
                code1 = distDecode[code1];
                code2 = code1 >> 16;
                if (code2 > 0)
                    code2 = this.getBits(code2);
                var dist = (code1 & 0xffff) + code2;
                if (pos + len >= limit) {
                    buffer = this.ensureBuffer(pos + len);
                    limit = buffer.length;
                }
                for (var k = 0; k < len; ++k, ++pos)
                    buffer[pos] = buffer[pos - dist];
            }
        };
      
        return constructor;
    })();

    PNG.load = function(url, callback) {
        loadURLasArrayBuffer(url, function(err, response) {
            var ret = null;
            if (!err) {

                try {
                    var data, png;
                    data = new Uint8Array(response);
                    png = new PNG(data);
                    ret = png.decode();
                }
                catch (e) {
                    err = e
                }
                
            }
            callback(err, ret);
        });
    };

    function PNG(data) {
        var chunkSize, colors, delayDen, delayNum, frame, i, index, key, section, short, text, _i, _j, _ref;
        this.data = data;
        this.pos = 8;
        this.palette = [];
        this.imgData = [];
        this.transparency = {};
        this.animation = null;
        this.text = {};
        frame = null;
        while (true) {
            chunkSize = this.readUInt32();
            section = ((function() {
            var _i, _results;
            _results = [];
            for (i = _i = 0; _i < 4; i = ++_i) {
                _results.push(String.fromCharCode(this.data[this.pos++]));
            }
            return _results;
            }).call(this)).join('');
            switch (section) {
            case 'IHDR':
                this.width = this.readUInt32();
                this.height = this.readUInt32();
                this.bits = this.data[this.pos++];
                this.colorType = this.data[this.pos++];
                this.compressionMethod = this.data[this.pos++];
                this.filterMethod = this.data[this.pos++];
                this.interlaceMethod = this.data[this.pos++];
                break;
            case 'acTL':
                this.animation = {
                numFrames: this.readUInt32(),
                numPlays: this.readUInt32() || Infinity,
                frames: []
                };
                break;
            case 'PLTE':
                this.palette = this.read(chunkSize);
                break;
            case 'fcTL':
                if (frame) {
                this.animation.frames.push(frame);
                }
                this.pos += 4;
                frame = {
                width: this.readUInt32(),
                height: this.readUInt32(),
                xOffset: this.readUInt32(),
                yOffset: this.readUInt32()
                };
                delayNum = this.readUInt16();
                delayDen = this.readUInt16() || 100;
                frame.delay = 1000 * delayNum / delayDen;
                frame.disposeOp = this.data[this.pos++];
                frame.blendOp = this.data[this.pos++];
                frame.data = [];
                break;
            case 'IDAT':
            case 'fdAT':
                if (section === 'fdAT') {
                this.pos += 4;
                chunkSize -= 4;
                }
                data = (frame != null ? frame.data : void 0) || this.imgData;
                for (i = _i = 0; 0 <= chunkSize ? _i < chunkSize : _i > chunkSize; i = 0 <= chunkSize ? ++_i : --_i) {
                data.push(this.data[this.pos++]);
                }
                break;
            case 'tRNS':
                this.transparency = {};
                switch (this.colorType) {
                case 3:
                    this.transparency.indexed = this.read(chunkSize);
                    short = 255 - this.transparency.indexed.length;
                    if (short > 0) {
                    for (i = _j = 0; 0 <= short ? _j < short : _j > short; i = 0 <= short ? ++_j : --_j) {
                        this.transparency.indexed.push(255);
                    }
                    }
                    break;
                case 0:
                    this.transparency.grayscale = this.read(chunkSize)[0];
                    break;
                case 2:
                    this.transparency.rgb = this.read(chunkSize);
                }
                break;
            case 'tEXt':
                text = this.read(chunkSize);
                index = text.indexOf(0);
                key = String.fromCharCode.apply(String, text.slice(0, index));
                this.text[key] = String.fromCharCode.apply(String, text.slice(index + 1));
                break;
            case 'IEND':
                if (frame) {
                this.animation.frames.push(frame);
                }
                this.colors = (function() {
                switch (this.colorType) {
                    case 0:
                    case 3:
                    case 4:
                    return 1;
                    case 2:
                    case 6:
                    return 3;
                }
                }).call(this);
                this.hasAlphaChannel = (_ref = this.colorType) === 4 || _ref === 6;
                colors = this.colors + (this.hasAlphaChannel ? 1 : 0);
                this.pixelBitlength = this.bits * colors;
                this.colorSpace = (function() {
                switch (this.colors) {
                    case 1:
                    return 'DeviceGray';
                    case 3:
                    return 'DeviceRGB';
                }
                }).call(this);
                this.imgData = new Uint8Array(this.imgData);
                return;
            default:
                this.pos += chunkSize;
            }
            this.pos += 4;
            if (this.pos > this.data.length) {
            throw new Error("Incomplete or corrupt PNG file");
            }
        }
        return;
    }

    PNG.prototype.read = function(bytes) {
        var i, _i, _results;
        _results = [];
        for (i = _i = 0; 0 <= bytes ? _i < bytes : _i > bytes; i = 0 <= bytes ? ++_i : --_i) {
            _results.push(this.data[this.pos++]);
        }
        return _results;
    };

    PNG.prototype.readUInt32 = function() {
        var b1, b2, b3, b4;
        b1 = this.data[this.pos++] << 24;
        b2 = this.data[this.pos++] << 16;
        b3 = this.data[this.pos++] << 8;
        b4 = this.data[this.pos++];
        return b1 | b2 | b3 | b4;
    };

    PNG.prototype.readUInt16 = function() {
        var b1, b2;
        b1 = this.data[this.pos++] << 8;
        b2 = this.data[this.pos++];
        return b1 | b2;
    };

    PNG.prototype.decodePixels = function(data) {
        var byte, c, col, i, left, length, p, pa, paeth, pb, pc, pixelBytes, pixels, pos, row, scanlineLength, upper, upperLeft, _i, _j, _k, _l, _m;
        if (data == null) {
            data = this.imgData;
        }
        if (data.length === 0) {
            return new Uint8Array(0);
        }
        data = new FlateStream(data);
        data = data.getBytes();
        pixelBytes = this.pixelBitlength / 8;
        scanlineLength = pixelBytes * this.width;
        pixels = new Uint8Array(scanlineLength * this.height);
        length = data.length;
        row = 0;
        pos = 0;
        c = 0;
        while (pos < length) {
            switch (data[pos++]) {
            case 0:
                for (i = _i = 0; _i < scanlineLength; i = _i += 1) {
                pixels[c++] = data[pos++];
                }
                break;
            case 1:
                for (i = _j = 0; _j < scanlineLength; i = _j += 1) {
                byte = data[pos++];
                left = i < pixelBytes ? 0 : pixels[c - pixelBytes];
                pixels[c++] = (byte + left) % 256;
                }
                break;
            case 2:
                for (i = _k = 0; _k < scanlineLength; i = _k += 1) {
                byte = data[pos++];
                col = (i - (i % pixelBytes)) / pixelBytes;
                upper = row && pixels[(row - 1) * scanlineLength + col * pixelBytes + (i % pixelBytes)];
                pixels[c++] = (upper + byte) % 256;
                }
                break;
            case 3:
                for (i = _l = 0; _l < scanlineLength; i = _l += 1) {
                byte = data[pos++];
                col = (i - (i % pixelBytes)) / pixelBytes;
                left = i < pixelBytes ? 0 : pixels[c - pixelBytes];
                upper = row && pixels[(row - 1) * scanlineLength + col * pixelBytes + (i % pixelBytes)];
                pixels[c++] = (byte + Math.floor((left + upper) / 2)) % 256;
                }
                break;
            case 4:
                for (i = _m = 0; _m < scanlineLength; i = _m += 1) {
                byte = data[pos++];
                col = (i - (i % pixelBytes)) / pixelBytes;
                left = i < pixelBytes ? 0 : pixels[c - pixelBytes];
                if (row === 0) {
                    upper = upperLeft = 0;
                } else {
                    upper = pixels[(row - 1) * scanlineLength + col * pixelBytes + (i % pixelBytes)];
                    upperLeft = col && pixels[(row - 1) * scanlineLength + (col - 1) * pixelBytes + (i % pixelBytes)];
                }
                p = left + upper - upperLeft;
                pa = Math.abs(p - left);
                pb = Math.abs(p - upper);
                pc = Math.abs(p - upperLeft);
                if (pa <= pb && pa <= pc) {
                    paeth = left;
                } else if (pb <= pc) {
                    paeth = upper;
                } else {
                    paeth = upperLeft;
                }
                pixels[c++] = (byte + paeth) % 256;
                }
                break;
            default:
                throw new Error("Invalid filter algorithm: " + data[pos - 1]);
            }
            row++;
        }
        return pixels;
    };

    PNG.prototype.decodePalette = function() {
        var c, i, length, palette, pos, ret, transparency, _i, _ref, _ref1;
        palette = this.palette;
        transparency = this.transparency.indexed || [];
        ret = new Uint8Array((transparency.length || 0) + palette.length);
        pos = 0;
        length = palette.length;
        c = 0;
        for (i = _i = 0, _ref = palette.length; _i < _ref; i = _i += 3) {
            ret[pos++] = palette[i];
            ret[pos++] = palette[i + 1];
            ret[pos++] = palette[i + 2];
            ret[pos++] = (_ref1 = transparency[c++]) != null ? _ref1 : 255;
        }
        return ret;
    };

    PNG.prototype.copyToImageData = function(imageData, pixels) {
        var alpha, colors, data, i, input, j, k, length, palette, v, _ref;
        colors = this.colors;
        palette = null;
        alpha = this.hasAlphaChannel;
        if (this.palette.length) {
            palette = (_ref = this._decodedPalette) != null ? _ref : this._decodedPalette = this.decodePalette();
            colors = 4;
            alpha = true;
        }
        data = imageData.data || imageData;
        length = data.length;
        input = palette || pixels;
        i = j = 0;
        if (colors === 1) {
            while (i < length) {
            k = palette ? pixels[i / 4] * 4 : j;
            v = input[k++];
            data[i++] = v;
            data[i++] = v;
            data[i++] = v;
            data[i++] = alpha ? input[k++] : 255;
            j = k;
            }
        } else {
            while (i < length) {
            k = palette ? pixels[i / 4] * 4 : j;
            data[i++] = input[k++];
            data[i++] = input[k++];
            data[i++] = input[k++];
            data[i++] = alpha ? input[k++] : 255;
            j = k;
            }
        }
    };

    PNG.prototype.decode = function() {
        var ret;
        ret = new Uint8Array(this.width * this.height * 4);
        this.copyToImageData(ret, this.decodePixels());
        return {width: this.width, height: this.height, data: ret};
    };

    return PNG;

})();



// https://github.com/mozilla/pdf.js
// https://github.com/notmasteryet/jpgjs
var JPEG = (function () { 
    JPEG.load = function (url, callback) {
        loadURLasArrayBuffer(url, function(err, response) {
            var ret = null;
            if (!err) {
                try {
                    var data, jpeg;
                    data = new Uint8Array(response);
                    jpeg = new JPEG(data);
                    ret = jpeg.decode();
                }
                catch (e) {
                    err = e;
                }
            }
            callback(err, ret);
        });
    }
    
    
    function JPEG (data) {
        var dctZigZag = new Uint8Array([ 0, 1, 8, 16, 9, 2, 3, 10, 17, 24, 32, 25, 18, 11, 4, 5, 12, 19, 26, 33, 40, 48, 41, 34, 27, 20, 13, 6, 7, 14, 21, 28, 35, 42, 49, 56, 57, 50, 43, 36, 29, 22, 15, 23, 30, 37, 44, 51, 58, 59, 52, 45, 38, 31, 39, 46, 53, 60, 61, 54, 47, 55, 62, 63 ]);
        var dctCos1 = 4017;
        var dctSin1 = 799;
        var dctCos3 = 3406;
        var dctSin3 = 2276;
        var dctCos6 = 1567;
        var dctSin6 = 3784;
        var dctSqrt2 = 5793;
        var dctSqrt1d2 = 2896;
        function readUint16() {
            var value = data[offset] << 8 | data[offset + 1];
            offset += 2;
            return value;
        }
        function readDataBlock() {
            var length = readUint16();
            var array = data.subarray(offset, offset + length - 2);
            offset += array.length;
            return array;
        }
        function prepareComponents(frame) {
            var mcusPerLine = Math.ceil(frame.samplesPerLine / 8 / frame.maxH);
            var mcusPerColumn = Math.ceil(frame.scanLines / 8 / frame.maxV);
            for (var i = 0; i < frame.components.length; i++) {
                component = frame.components[i];
                var blocksPerLine = Math.ceil(Math.ceil(frame.samplesPerLine / 8) * component.h / frame.maxH);
                var blocksPerColumn = Math.ceil(Math.ceil(frame.scanLines / 8) * component.v / frame.maxV);
                var blocksPerLineForMcu = mcusPerLine * component.h;
                var blocksPerColumnForMcu = mcusPerColumn * component.v;
                var blocksBufferSize = 64 * blocksPerColumnForMcu * (blocksPerLineForMcu + 1);
                component.blockData = new Int16Array(blocksBufferSize);
                component.blocksPerLine = blocksPerLine;
                component.blocksPerColumn = blocksPerColumn;
            }
            frame.mcusPerLine = mcusPerLine;
            frame.mcusPerColumn = mcusPerColumn;
        }
        var offset = 0, length = data.length;
        var jfif = null;
        var adobe = null;
        var pixels = null;
        var frame, resetInterval;
        var quantizationTables = [];
        var huffmanTablesAC = [], huffmanTablesDC = [];
        var fileMarker = readUint16();
        if (fileMarker !== 65496) {
            throw "SOI not found";
        }
        fileMarker = readUint16();
        while (fileMarker !== 65497) {
            var i, j, l;
            switch (fileMarker) {
              case 65504:
              case 65505:
              case 65506:
              case 65507:
              case 65508:
              case 65509:
              case 65510:
              case 65511:
              case 65512:
              case 65513:
              case 65514:
              case 65515:
              case 65516:
              case 65517:
              case 65518:
              case 65519:
              case 65534:
                var appData = readDataBlock();
                if (fileMarker === 65504) {
                    if (appData[0] === 74 && appData[1] === 70 && appData[2] === 73 && appData[3] === 70 && appData[4] === 0) {
                        jfif = {
                            version: {
                                major: appData[5],
                                minor: appData[6]
                            },
                            densityUnits: appData[7],
                            xDensity: appData[8] << 8 | appData[9],
                            yDensity: appData[10] << 8 | appData[11],
                            thumbWidth: appData[12],
                            thumbHeight: appData[13],
                            thumbData: appData.subarray(14, 14 + 3 * appData[12] * appData[13])
                        };
                    }
                }
                if (fileMarker === 65518) {
                    if (appData[0] === 65 && appData[1] === 100 && appData[2] === 111 && appData[3] === 98 && appData[4] === 101 && appData[5] === 0) {
                        adobe = {
                            version: appData[6],
                            flags0: appData[7] << 8 | appData[8],
                            flags1: appData[9] << 8 | appData[10],
                            transformCode: appData[11]
                        };
                    }
                }
                break;

              case 65499:
                var quantizationTablesLength = readUint16();
                var quantizationTablesEnd = quantizationTablesLength + offset - 2;
                var z;
                while (offset < quantizationTablesEnd) {
                    var quantizationTableSpec = data[offset++];
                    var qId = quantizationTableSpec & 15;
                    if (!quantizationTables[qId]) {
                        quantizationTables[qId] = new Int32Array(64);
                    }
                    if (quantizationTableSpec >> 4 === 0) {
                        for (j = 0; j < 64; j++) {
                            z = dctZigZag[j];
                            quantizationTables[qId][z] = data[offset++];
                        }
                    } else if (quantizationTableSpec >> 4 === 1) {
                        for (j = 0; j < 64; j++) {
                            z = dctZigZag[j];
                            quantizationTables[qId][z] = readUint16();
                        }
                    } else {
                        throw "DQT: invalid table spec";
                    }
                }
                break;

              case 65472:
              case 65473:
              case 65474:
                if (frame) {
                    throw "Only single frame JPEGs supported";
                }
                readUint16();
                frame = {};
                frame.extended = fileMarker === 65473;
                frame.progressive = fileMarker === 65474;
                frame.precision = data[offset++];
                frame.scanLines = readUint16();
                frame.samplesPerLine = readUint16();
                frame.components = [];
                frame.componentIds = {};
                var componentsCount = data[offset++], componentId;
                var maxH = 0, maxV = 0;
                for (i = 0; i < componentsCount; i++) {
                    componentId = data[offset];
                    var h = data[offset + 1] >> 4;
                    var v = data[offset + 1] & 15;
                    if (maxH < h) {
                        maxH = h;
                    }
                    if (maxV < v) {
                        maxV = v;
                    }
                    var qId = data[offset + 2];
                    if (!quantizationTables[qId]) quantizationTables[qId] = new Int32Array(64);
                    l = frame.components.push({
                        h: h,
                        v: v,
                        quantizationTable: quantizationTables[qId]
                    });
                    frame.componentIds[componentId] = l - 1;
                    offset += 3;
                }
                frame.maxH = maxH;
                frame.maxV = maxV;
                prepareComponents(frame);
                break;

              case 65476:
                var huffmanLength = readUint16();
                for (i = 2; i < huffmanLength; ) {
                    var huffmanTableSpec = data[offset++];
                    var codeLengths = new Uint8Array(16);
                    var codeLengthSum = 0;
                    for (j = 0; j < 16; j++, offset++) {
                        codeLengthSum += codeLengths[j] = data[offset];
                    }
                    var huffmanValues = new Uint8Array(codeLengthSum);
                    for (j = 0; j < codeLengthSum; j++, offset++) {
                        huffmanValues[j] = data[offset];
                    }
                    i += 17 + codeLengthSum;
                    (huffmanTableSpec >> 4 === 0 ? huffmanTablesDC : huffmanTablesAC)[huffmanTableSpec & 15] = buildHuffmanTable(codeLengths, huffmanValues);
                }
                break;

              case 65501:
                readUint16();
                resetInterval = readUint16();
                break;

              case 65498:
                var scanLength = readUint16();
                var selectorsCount = data[offset++];
                var components = [], component;
                for (i = 0; i < selectorsCount; i++) {
                    var componentIndex = frame.componentIds[data[offset++]];
                    component = frame.components[componentIndex];
                    var tableSpec = data[offset++];
                    component.huffmanTableDC = huffmanTablesDC[tableSpec >> 4];
                    component.huffmanTableAC = huffmanTablesAC[tableSpec & 15];
                    components.push(component);
                }
                var spectralStart = data[offset++];
                var spectralEnd = data[offset++];
                var successiveApproximation = data[offset++];
                var processed = decodeScan(data, offset, frame, components, resetInterval, spectralStart, spectralEnd, successiveApproximation >> 4, successiveApproximation & 15);
                offset += processed;
                break;

              case 65535:
                if (data[offset] !== 255) {
                    offset--;
                }
                break;

              default:
                if (data[offset - 3] === 255 && data[offset - 2] >= 192 && data[offset - 2] <= 254) {
                    offset -= 3;
                    break;
                }
                throw "unknown JPEG marker " + fileMarker.toString(16);
            }
            fileMarker = readUint16();
        }
        this.width = frame.samplesPerLine;
        this.height = frame.scanLines;
        this.jfif = jfif;
        this.adobe = adobe;
        this.components = [];
        for (i = 0; i < frame.components.length; i++) {
            component = frame.components[i];
            this.components.push({
                output: buildComponentData(frame, component),
                scaleX: component.h / frame.maxH,
                scaleY: component.v / frame.maxV,
                blocksPerLine: component.blocksPerLine,
                blocksPerColumn: component.blocksPerColumn
            });
        }
        this.numComponents = this.components.length;
        function buildHuffmanTable(codeLengths, values) {
            var k = 0, code = [], i, j, length = 16;
            while (length > 0 && !codeLengths[length - 1]) {
                length--;
            }
            code.push({
                children: [],
                index: 0
            });
            var p = code[0], q;
            for (i = 0; i < length; i++) {
                for (j = 0; j < codeLengths[i]; j++) {
                    p = code.pop();
                    p.children[p.index] = values[k];
                    while (p.index > 0) {
                        p = code.pop();
                    }
                    p.index++;
                    code.push(p);
                    while (code.length <= i) {
                        code.push(q = {
                            children: [],
                            index: 0
                        });
                        p.children[p.index] = q.children;
                        p = q;
                    }
                    k++;
                }
                if (i + 1 < length) {
                    code.push(q = {
                        children: [],
                        index: 0
                    });
                    p.children[p.index] = q.children;
                    p = q;
                }
            }
            return code[0].children;
        }
        function getBlockBufferOffset(component, row, col) {
            return 64 * ((component.blocksPerLine + 1) * row + col);
        }
        function decodeScan(data, offset, frame, components, resetInterval, spectralStart, spectralEnd, successivePrev, successive) {
            var precision = frame.precision;
            var samplesPerLine = frame.samplesPerLine;
            var scanLines = frame.scanLines;
            var mcusPerLine = frame.mcusPerLine;
            var progressive = frame.progressive;
            var maxH = frame.maxH, maxV = frame.maxV;
            var startOffset = offset, bitsData = 0, bitsCount = 0;
            function readBit() {
                if (bitsCount > 0) {
                    bitsCount--;
                    return bitsData >> bitsCount & 1;
                }
                bitsData = data[offset++];
                if (bitsData === 255) {
                    var nextByte = data[offset++];
                    if (nextByte) {
                        throw "unexpected marker: " + (bitsData << 8 | nextByte).toString(16);
                    }
                }
                bitsCount = 7;
                return bitsData >>> 7;
            }
            function decodeHuffman(tree) {
                var node = tree;
                while (true) {
                    node = node[readBit()];
                    if (typeof node === "number") {
                        return node;
                    }
                    if (typeof node !== "object") {
                        throw "invalid huffman sequence";
                    }
                }
            }
            function receive(length) {
                var n = 0;
                while (length > 0) {
                    n = n << 1 | readBit();
                    length--;
                }
                return n;
            }
            function receiveAndExtend(length) {
                if (length === 1) {
                    return readBit() === 1 ? 1 : -1;
                }
                var n = receive(length);
                if (n >= 1 << length - 1) {
                    return n;
                }
                return n + (-1 << length) + 1;
            }
            function decodeBaseline(component, offset) {
                var t = decodeHuffman(component.huffmanTableDC);
                var diff = t === 0 ? 0 : receiveAndExtend(t);
                component.blockData[offset] = component.pred += diff;
                var k = 1;
                while (k < 64) {
                    var rs = decodeHuffman(component.huffmanTableAC);
                    var s = rs & 15, r = rs >> 4;
                    if (s === 0) {
                        if (r < 15) {
                            break;
                        }
                        k += 16;
                        continue;
                    }
                    k += r;
                    var z = dctZigZag[k];
                    component.blockData[offset + z] = receiveAndExtend(s);
                    k++;
                }
            }
            function decodeDCFirst(component, offset) {
                var t = decodeHuffman(component.huffmanTableDC);
                var diff = t === 0 ? 0 : receiveAndExtend(t) << successive;
                component.blockData[offset] = component.pred += diff;
            }
            function decodeDCSuccessive(component, offset) {
                component.blockData[offset] |= readBit() << successive;
            }
            var eobrun = 0;
            function decodeACFirst(component, offset) {
                if (eobrun > 0) {
                    eobrun--;
                    return;
                }
                var k = spectralStart, e = spectralEnd;
                while (k <= e) {
                    var rs = decodeHuffman(component.huffmanTableAC);
                    var s = rs & 15, r = rs >> 4;
                    if (s === 0) {
                        if (r < 15) {
                            eobrun = receive(r) + (1 << r) - 1;
                            break;
                        }
                        k += 16;
                        continue;
                    }
                    k += r;
                    var z = dctZigZag[k];
                    component.blockData[offset + z] = receiveAndExtend(s) * (1 << successive);
                    k++;
                }
            }
            var successiveACState = 0, successiveACNextValue;
            function decodeACSuccessive(component, offset) {
                var k = spectralStart;
                var e = spectralEnd;
                var r = 0;
                var s;
                var rs;
                while (k <= e) {
                    var z = dctZigZag[k];
                    switch (successiveACState) {
                      case 0:
                        rs = decodeHuffman(component.huffmanTableAC);
                        s = rs & 15;
                        r = rs >> 4;
                        if (s === 0) {
                            if (r < 15) {
                                eobrun = receive(r) + (1 << r);
                                successiveACState = 4;
                            } else {
                                r = 16;
                                successiveACState = 1;
                            }
                        } else {
                            if (s !== 1) {
                                throw "invalid ACn encoding";
                            }
                            successiveACNextValue = receiveAndExtend(s);
                            successiveACState = r ? 2 : 3;
                        }
                        continue;

                      case 1:
                      case 2:
                        if (component.blockData[offset + z]) {
                            component.blockData[offset + z] += readBit() << successive;
                        } else {
                            r--;
                            if (r === 0) {
                                successiveACState = successiveACState === 2 ? 3 : 0;
                            }
                        }
                        break;

                      case 3:
                        if (component.blockData[offset + z]) {
                            component.blockData[offset + z] += readBit() << successive;
                        } else {
                            component.blockData[offset + z] = successiveACNextValue << successive;
                            successiveACState = 0;
                        }
                        break;

                      case 4:
                        if (component.blockData[offset + z]) {
                            component.blockData[offset + z] += readBit() << successive;
                        }
                        break;
                    }
                    k++;
                }
                if (successiveACState === 4) {
                    eobrun--;
                    if (eobrun === 0) {
                        successiveACState = 0;
                    }
                }
            }
            function decodeMcu(component, decode, mcu, row, col) {
                var mcuRow = mcu / mcusPerLine | 0;
                var mcuCol = mcu % mcusPerLine;
                var blockRow = mcuRow * component.v + row;
                var blockCol = mcuCol * component.h + col;
                var offset = getBlockBufferOffset(component, blockRow, blockCol);
                decode(component, offset);
            }
            function decodeBlock(component, decode, mcu) {
                var blockRow = mcu / component.blocksPerLine | 0;
                var blockCol = mcu % component.blocksPerLine;
                var offset = getBlockBufferOffset(component, blockRow, blockCol);
                decode(component, offset);
            }
            var componentsLength = components.length;
            var component, i, j, k, n;
            var decodeFn;
            if (progressive) {
                if (spectralStart === 0) {
                    decodeFn = successivePrev === 0 ? decodeDCFirst : decodeDCSuccessive;
                } else {
                    decodeFn = successivePrev === 0 ? decodeACFirst : decodeACSuccessive;
                }
            } else {
                decodeFn = decodeBaseline;
            }
            var mcu = 0, marker;
            var mcuExpected;
            if (componentsLength === 1) {
                mcuExpected = components[0].blocksPerLine * components[0].blocksPerColumn;
            } else {
                mcuExpected = mcusPerLine * frame.mcusPerColumn;
            }
            if (!resetInterval) {
                resetInterval = mcuExpected;
            }
            var h, v;
            while (mcu < mcuExpected) {
                for (i = 0; i < componentsLength; i++) {
                    components[i].pred = 0;
                }
                eobrun = 0;
                if (componentsLength === 1) {
                    component = components[0];
                    for (n = 0; n < resetInterval; n++) {
                        decodeBlock(component, decodeFn, mcu);
                        mcu++;
                    }
                } else {
                    for (n = 0; n < resetInterval; n++) {
                        for (i = 0; i < componentsLength; i++) {
                            component = components[i];
                            h = component.h;
                            v = component.v;
                            for (j = 0; j < v; j++) {
                                for (k = 0; k < h; k++) {
                                    decodeMcu(component, decodeFn, mcu, j, k);
                                }
                            }
                        }
                        mcu++;
                    }
                }
                bitsCount = 0;
                marker = data[offset] << 8 | data[offset + 1];
                if (marker <= 65280) {
                    throw "marker was not found";
                }
                if (marker >= 65488 && marker <= 65495) {
                    offset += 2;
                } else {
                    break;
                }
            }
            return offset - startOffset;
        }
        function quantizeAndInverse(component, blockBufferOffset, p) {
            var qt = component.quantizationTable, blockData = component.blockData;
            var v0, v1, v2, v3, v4, v5, v6, v7;
            var p0, p1, p2, p3, p4, p5, p6, p7;
            var t;
            for (var row = 0; row < 64; row += 8) {
                p0 = blockData[blockBufferOffset + row];
                p1 = blockData[blockBufferOffset + row + 1];
                p2 = blockData[blockBufferOffset + row + 2];
                p3 = blockData[blockBufferOffset + row + 3];
                p4 = blockData[blockBufferOffset + row + 4];
                p5 = blockData[blockBufferOffset + row + 5];
                p6 = blockData[blockBufferOffset + row + 6];
                p7 = blockData[blockBufferOffset + row + 7];
                qt && (p0 *= qt[row]);
                if ((p1 | p2 | p3 | p4 | p5 | p6 | p7) === 0) {
                    t = dctSqrt2 * p0 + 512 >> 10;
                    p[row] = t;
                    p[row + 1] = t;
                    p[row + 2] = t;
                    p[row + 3] = t;
                    p[row + 4] = t;
                    p[row + 5] = t;
                    p[row + 6] = t;
                    p[row + 7] = t;
                    continue;
                }
                p1 *= qt[row + 1];
                p2 *= qt[row + 2];
                p3 *= qt[row + 3];
                p4 *= qt[row + 4];
                p5 *= qt[row + 5];
                p6 *= qt[row + 6];
                p7 *= qt[row + 7];
                v0 = dctSqrt2 * p0 + 128 >> 8;
                v1 = dctSqrt2 * p4 + 128 >> 8;
                v2 = p2;
                v3 = p6;
                v4 = dctSqrt1d2 * (p1 - p7) + 128 >> 8;
                v7 = dctSqrt1d2 * (p1 + p7) + 128 >> 8;
                v5 = p3 << 4;
                v6 = p5 << 4;
                v0 = v0 + v1 + 1 >> 1;
                v1 = v0 - v1;
                t = v2 * dctSin6 + v3 * dctCos6 + 128 >> 8;
                v2 = v2 * dctCos6 - v3 * dctSin6 + 128 >> 8;
                v3 = t;
                v4 = v4 + v6 + 1 >> 1;
                v6 = v4 - v6;
                v7 = v7 + v5 + 1 >> 1;
                v5 = v7 - v5;
                v0 = v0 + v3 + 1 >> 1;
                v3 = v0 - v3;
                v1 = v1 + v2 + 1 >> 1;
                v2 = v1 - v2;
                t = v4 * dctSin3 + v7 * dctCos3 + 2048 >> 12;
                v4 = v4 * dctCos3 - v7 * dctSin3 + 2048 >> 12;
                v7 = t;
                t = v5 * dctSin1 + v6 * dctCos1 + 2048 >> 12;
                v5 = v5 * dctCos1 - v6 * dctSin1 + 2048 >> 12;
                v6 = t;
                p[row] = v0 + v7;
                p[row + 7] = v0 - v7;
                p[row + 1] = v1 + v6;
                p[row + 6] = v1 - v6;
                p[row + 2] = v2 + v5;
                p[row + 5] = v2 - v5;
                p[row + 3] = v3 + v4;
                p[row + 4] = v3 - v4;
            }
            for (var col = 0; col < 8; ++col) {
                p0 = p[col];
                p1 = p[col + 8];
                p2 = p[col + 16];
                p3 = p[col + 24];
                p4 = p[col + 32];
                p5 = p[col + 40];
                p6 = p[col + 48];
                p7 = p[col + 56];
                if ((p1 | p2 | p3 | p4 | p5 | p6 | p7) === 0) {
                    t = dctSqrt2 * p0 + 8192 >> 14;
                    t = t < -2040 ? 0 : t >= 2024 ? 255 : t + 2056 >> 4;
                    blockData[blockBufferOffset + col] = t;
                    blockData[blockBufferOffset + col + 8] = t;
                    blockData[blockBufferOffset + col + 16] = t;
                    blockData[blockBufferOffset + col + 24] = t;
                    blockData[blockBufferOffset + col + 32] = t;
                    blockData[blockBufferOffset + col + 40] = t;
                    blockData[blockBufferOffset + col + 48] = t;
                    blockData[blockBufferOffset + col + 56] = t;
                    continue;
                }
                v0 = dctSqrt2 * p0 + 2048 >> 12;
                v1 = dctSqrt2 * p4 + 2048 >> 12;
                v2 = p2;
                v3 = p6;
                v4 = dctSqrt1d2 * (p1 - p7) + 2048 >> 12;
                v7 = dctSqrt1d2 * (p1 + p7) + 2048 >> 12;
                v5 = p3;
                v6 = p5;
                v0 = (v0 + v1 + 1 >> 1) + 4112;
                v1 = v0 - v1;
                t = v2 * dctSin6 + v3 * dctCos6 + 2048 >> 12;
                v2 = v2 * dctCos6 - v3 * dctSin6 + 2048 >> 12;
                v3 = t;
                v4 = v4 + v6 + 1 >> 1;
                v6 = v4 - v6;
                v7 = v7 + v5 + 1 >> 1;
                v5 = v7 - v5;
                v0 = v0 + v3 + 1 >> 1;
                v3 = v0 - v3;
                v1 = v1 + v2 + 1 >> 1;
                v2 = v1 - v2;
                t = v4 * dctSin3 + v7 * dctCos3 + 2048 >> 12;
                v4 = v4 * dctCos3 - v7 * dctSin3 + 2048 >> 12;
                v7 = t;
                t = v5 * dctSin1 + v6 * dctCos1 + 2048 >> 12;
                v5 = v5 * dctCos1 - v6 * dctSin1 + 2048 >> 12;
                v6 = t;
                p0 = v0 + v7;
                p7 = v0 - v7;
                p1 = v1 + v6;
                p6 = v1 - v6;
                p2 = v2 + v5;
                p5 = v2 - v5;
                p3 = v3 + v4;
                p4 = v3 - v4;
                p0 = p0 < 16 ? 0 : p0 >= 4080 ? 255 : p0 >> 4;
                p1 = p1 < 16 ? 0 : p1 >= 4080 ? 255 : p1 >> 4;
                p2 = p2 < 16 ? 0 : p2 >= 4080 ? 255 : p2 >> 4;
                p3 = p3 < 16 ? 0 : p3 >= 4080 ? 255 : p3 >> 4;
                p4 = p4 < 16 ? 0 : p4 >= 4080 ? 255 : p4 >> 4;
                p5 = p5 < 16 ? 0 : p5 >= 4080 ? 255 : p5 >> 4;
                p6 = p6 < 16 ? 0 : p6 >= 4080 ? 255 : p6 >> 4;
                p7 = p7 < 16 ? 0 : p7 >= 4080 ? 255 : p7 >> 4;
                blockData[blockBufferOffset + col] = p0;
                blockData[blockBufferOffset + col + 8] = p1;
                blockData[blockBufferOffset + col + 16] = p2;
                blockData[blockBufferOffset + col + 24] = p3;
                blockData[blockBufferOffset + col + 32] = p4;
                blockData[blockBufferOffset + col + 40] = p5;
                blockData[blockBufferOffset + col + 48] = p6;
                blockData[blockBufferOffset + col + 56] = p7;
            }
        }
        function buildComponentData(frame, component) {
            var blocksPerLine = component.blocksPerLine;
            var blocksPerColumn = component.blocksPerColumn;
            var computationBuffer = new Int16Array(64);
            for (var blockRow = 0; blockRow < blocksPerColumn; blockRow++) {
                for (var blockCol = 0; blockCol < blocksPerLine; blockCol++) {
                    var offset = getBlockBufferOffset(component, blockRow, blockCol);
                    quantizeAndInverse(component, offset, computationBuffer);
                }
            }
            return component.blockData;
        }
    }

    JPEG.prototype = {
        _getLinearizedBlockData: function getLinearizedBlockData(width, height) {
            var scaleX = this.width / width, scaleY = this.height / height;
            var component, componentScaleX, componentScaleY, blocksPerScanline;
            var x, y, i, j, k;
            var index;
            var offset = 0;
            var output;
            var numComponents = this.components.length;
            var dataLength = width * height * numComponents;
            var data = new Uint8Array(dataLength);
            var xScaleBlockOffset = new Uint32Array(width);
            var mask3LSB = 4294967288;
            for (i = 0; i < numComponents; i++) {
                component = this.components[i];
                componentScaleX = component.scaleX * scaleX;
                componentScaleY = component.scaleY * scaleY;
                offset = i;
                output = component.output;
                blocksPerScanline = component.blocksPerLine + 1 << 3;
                for (x = 0; x < width; x++) {
                    j = 0 | x * componentScaleX;
                    xScaleBlockOffset[x] = (j & mask3LSB) << 3 | j & 7;
                }
                for (y = 0; y < height; y++) {
                    j = 0 | y * componentScaleY;
                    index = blocksPerScanline * (j & mask3LSB) | (j & 7) << 3;
                    for (x = 0; x < width; x++) {
                        data[offset] = output[index + xScaleBlockOffset[x]];
                        offset += numComponents;
                    }
                }
            }
            var transform = this.decodeTransform;
            if (transform) {
                for (i = 0; i < dataLength; ) {
                    for (j = 0, k = 0; j < numComponents; j++, i++, k += 2) {
                        data[i] = (data[i] * transform[k] >> 8) + transform[k + 1];
                    }
                }
            }
            return data;
        },
        _isColorConversionNeeded: function isColorConversionNeeded() {
            if (this.adobe && this.adobe.transformCode) {
                return true;
            } else if (this.numComponents === 3) {
                return true;
            } else {
                return false;
            }
        },
        _convertYccToRgb: function convertYccToRgb(data) {
            var Y, Cb, Cr;
            for (var i = 0, length = data.length; i < length; i += 3) {
                Y = data[i];
                Cb = data[i + 1];
                Cr = data[i + 2];
                data[i] = clamp0to255(Y - 179.456 + 1.402 * Cr);
                data[i + 1] = clamp0to255(Y + 135.459 - .344 * Cb - .714 * Cr);
                data[i + 2] = clamp0to255(Y - 226.816 + 1.772 * Cb);
            }
            return data;
        },
        _convertYcckToRgb: function convertYcckToRgb(data) {
            var Y, Cb, Cr, k;
            var offset = 0;
            for (var i = 0, length = data.length; i < length; i += 4) {
                Y = data[i];
                Cb = data[i + 1];
                Cr = data[i + 2];
                k = data[i + 3];
                var r = -122.67195406894 + Cb * (-660635669420364e-19 * Cb + .000437130475926232 * Cr - 54080610064599e-18 * Y + .00048449797120281 * k - .154362151871126) + Cr * (-.000957964378445773 * Cr + .000817076911346625 * Y - .00477271405408747 * k + 1.53380253221734) + Y * (.000961250184130688 * Y - .00266257332283933 * k + .48357088451265) + k * (-.000336197177618394 * k + .484791561490776);
                var g = 107.268039397724 + Cb * (219927104525741e-19 * Cb - .000640992018297945 * Cr + .000659397001245577 * Y + .000426105652938837 * k - .176491792462875) + Cr * (-.000778269941513683 * Cr + .00130872261408275 * Y + .000770482631801132 * k - .151051492775562) + Y * (.00126935368114843 * Y - .00265090189010898 * k + .25802910206845) + k * (-.000318913117588328 * k - .213742400323665);
                var b = -20.810012546947 + Cb * (-.000570115196973677 * Cb - 263409051004589e-19 * Cr + .0020741088115012 * Y - .00288260236853442 * k + .814272968359295) + Cr * (-153496057440975e-19 * Cr - .000132689043961446 * Y + .000560833691242812 * k - .195152027534049) + Y * (.00174418132927582 * Y - .00255243321439347 * k + .116935020465145) + k * (-.000343531996510555 * k + .24165260232407);
                data[offset++] = clamp0to255(r);
                data[offset++] = clamp0to255(g);
                data[offset++] = clamp0to255(b);
            }
            return data;
        },
        _convertYcckToCmyk: function convertYcckToCmyk(data) {
            var Y, Cb, Cr;
            for (var i = 0, length = data.length; i < length; i += 4) {
                Y = data[i];
                Cb = data[i + 1];
                Cr = data[i + 2];
                data[i] = clamp0to255(434.456 - Y - 1.402 * Cr);
                data[i + 1] = clamp0to255(119.541 - Y + .344 * Cb + .714 * Cr);
                data[i + 2] = clamp0to255(481.816 - Y - 1.772 * Cb);
            }
            return data;
        },
        _convertCmykToRgb: function convertCmykToRgb(data) {
            var c, m, y, k;
            var offset = 0;
            var min = -255 * 255 * 255;
            var scale = 1 / 255 / 255;
            for (var i = 0, length = data.length; i < length; i += 4) {
                c = data[i];
                m = data[i + 1];
                y = data[i + 2];
                k = data[i + 3];
                var r = c * (-4.387332384609988 * c + 54.48615194189176 * m + 18.82290502165302 * y + 212.25662451639585 * k - 72734.4411664936) + m * (1.7149763477362134 * m - 5.6096736904047315 * y - 17.873870861415444 * k - 1401.7366389350734) + y * (-2.5217340131683033 * y - 21.248923337353073 * k + 4465.541406466231) - k * (21.86122147463605 * k + 48317.86113160301);
                var g = c * (8.841041422036149 * c + 60.118027045597366 * m + 6.871425592049007 * y + 31.159100130055922 * k - 20220.756542821975) + m * (-15.310361306967817 * m + 17.575251261109482 * y + 131.35250912493976 * k - 48691.05921601825) + y * (4.444339102852739 * y + 9.8632861493405 * k - 6341.191035517494) - k * (20.737325471181034 * k + 47890.15695978492);
                var b = c * (.8842522430003296 * c + 8.078677503112928 * m + 30.89978309703729 * y - .23883238689178934 * k - 3616.812083916688) + m * (10.49593273432072 * m + 63.02378494754052 * y + 50.606957656360734 * k - 28620.90484698408) + y * (.03296041114873217 * y + 115.60384449646641 * k - 49363.43385999684) - k * (22.33816807309886 * k + 45932.16563550634);
                data[offset++] = r >= 0 ? 255 : r <= min ? 0 : 255 + r * scale | 0;
                data[offset++] = g >= 0 ? 255 : g <= min ? 0 : 255 + g * scale | 0;
                data[offset++] = b >= 0 ? 255 : b <= min ? 0 : 255 + b * scale | 0;
            }
            return data;
        },
        getData: function getData(forceRGBoutput) {
            if (this.numComponents > 4) {
                throw "Unsupported color mode";
            }
            var data = this._getLinearizedBlockData(this.width, this.height);
            if (this.numComponents === 3) {
                return this._convertYccToRgb(data);
            } else if (this.numComponents === 4) {
                if (this._isColorConversionNeeded()) {
                    if (forceRGBoutput) {
                        return this._convertYcckToRgb(data);
                    } else {
                        return this._convertYcckToCmyk(data);
                    }
                } else if (forceRGBoutput) {
                    return this._convertCmykToRgb(data);
                }
            }
            return data;
        },
        decode: function () {
            var ret = new Uint8Array(this.width * this.height * 4);
            this.copyToImageData(ret);
            return {data: ret, width: this.width, height: this.height};
        },
        copyToImageData: function (imageData) {
            
            var imageDataArray = imageData.data || imageData;
            var imageDataBytes = imageDataArray.length;
            var i, j;
            if (this.numComponents === 1) {
                var values = this.getData(false);
                for (i = 0, j = 0; i < imageDataBytes; ) {
                    var value = values[j++];
                    imageDataArray[i++] = value;
                    imageDataArray[i++] = value;
                    imageDataArray[i++] = value;
                    imageDataArray[i++] = 255;
                }
                return;
            }
            var rgb = this.getData(true);
            for (i = 0, j = 0; i < imageDataBytes; ) {
                imageDataArray[i++] = rgb[j++];
                imageDataArray[i++] = rgb[j++];
                imageDataArray[i++] = rgb[j++];
                imageDataArray[i++] = 255;
            }
        }
    };

    return JPEG;
})();