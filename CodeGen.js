const Gen_CFG = require('./Gen_CFG.js'); 
const GC = new Gen_CFG();

const globalVars = new Set();
let fparamVars = new Map();
let flocalVars = new Map();
const getVarType = function(varName) {
    const varType = {};
    if(fparamVars.has(varName)) {
        varType.type = 'fparam';
        varType.address = fparamVars.get(varName);
    } else if(flocalVars.has(varName)) {
        varType.type = 'flocal';
        varType.address = flocalVars.get(varName);
    } else if(globalVars.has(varName)) {
        varType.type = 'global';
    }
    return varType;
};

/**
 * 代码生成器类
 * @class
 */
class CodeGen {
    constructor() {
        /**
         * 记录中间代码中的全局变量部分
         * @private
         * @type {Array}
         */
        this._global = null;

        /**
         * 记录中间代码中的函数部分
         * @private
         * @type {Array}
         */
        this._funcs = null;
        this._funcVarNum = null;

        /**
         * 记录寄存器分配结果
         * @private
         * @type {Map}
         */
        this._allocRes = null;

        /**
         * 记录汇编代码
         * @private
         * @type {Array}
         */
        this._data = null;
        this._bss = null;
        this._text = new Array();
        this._nasm = null;
    }
}

/**
 * 将中间代码和寄存器分配结果进行存储
 * @public
 * @param {Array} IR
 */
CodeGen.prototype.initialize = function(IR, allocRes) {
    this._global = IR.global;
    this._funcs = IR.funcs;
    this._funcVarNum = IR.funcVarNum;
    this._allocRes = allocRes;
};

/**
 * 将四元式中间代码翻译成汇编代码（NASM 格式）
 * @public
 * @return {Array}
 */
CodeGen.prototype._translateOneIR = function(IR) {
    const [p1, p2, p3, p4] = IR;
    const varType2 = getVarType(p2);
    const varType3 = getVarType(p3);
    const varType4 = getVarType(p4);
    let v2, v3, v4;
    let f2 = false; // 是否全局变量
    let f3 = false; // 是否全局变量
    let f4 = false; // 是否全局变量

    if(varType2.type === 'fparam') {
        v2 = `[rbp+${8+8*varType2.address}]`;
    } else if(varType2.type === 'flocal') {
        v2 = `[rbp-${8*varType2.address}]`;
    } else {
        v2 = p2;
        f2 = true;
    }

    if(varType3.type === 'fparam') {
        v3 = `[rbp+${8+8*varType3.address}]`;
    } else if(varType3.type === 'flocal') {
        v3 = `[rbp-${8*varType3.address}]`;
    } else {
        v3 = p3;
        f3 = true;
    }

    if(varType4.type === 'fparam') {
        v4 = `[rbp+${8+8*varType4.address}]`;
    } else if(varType4.type === 'flocal') {
        v4 = `[rbp-${8*varType4.address}]`;
    } else {
        v4 = p4;
        f4 = true;
    }

    f2 = f2 && isNaN(parseInt(p2));
    f3 = f3 && isNaN(parseInt(p3));
    f4 = f4 && isNaN(parseInt(p4));

    let nasm = new Array();
    if(p1 === 'uminus') {
        if(f2) {
            nasm.push(`\tmov\t\trbx, ${v2}`);   // rbx 变量地址
            nasm.push(`\tmov\t\trcx, [rbx]`);   // rcx 变量的值
        } else {
            nasm.push(`\tmov\t\trcx, ${v2}`);   // rcx 变量的值
        }
        nasm.push(`\tneg\t\trcx`);
        if(f4) {
            nasm.push(`\tmov\t\trbx, ${v4}`);   // rbx 变量地址
            nasm.push(`\tmov\t\t[rbx], rcx`);   // 写入目标变量
        } else {
            nasm.push(`\tmov\t\t${v4}, rcx`);   // 写入目标变量
        }
    } else if(p1 === '+') {
        if(f2) {
            nasm.push(`\tmov\t\trbx, ${v2}`);   // rbx 变量地址
            nasm.push(`\tmov\t\trcx, [rbx]`);   // rcx 变量的值
        } else {
            nasm.push(`\tmov\t\trcx, ${v2}`);   // rdx 变量1的值
        }
        if(f3) {
            nasm.push(`\tmov\t\trbx, ${v3}`);   // rbx 变量地址
            nasm.push(`\tmov\t\trdx, [rbx]`);   // rcx 变量的值
        } else {
            nasm.push(`\tmov\t\trdx, ${v3}`);   // rdx 变量2的值
        }
        nasm.push(`\tadd\t\trcx, rdx`);     // rcx <- rcx + rdx
        if(f4) {
            nasm.push(`\tmov\t\trbx, ${v4}`);   // rbx 变量地址
            nasm.push(`\tmov\t\t[rbx], rcx`);   // 写入目标变量
        } else {
            nasm.push(`\tmov\t\t${v4}, rcx`);   // 写入目标变量
        }
    } else if(p1 === '-') {
        if(f2) {
            nasm.push(`\tmov\t\trbx, ${v2}`);   // rbx 变量地址
            nasm.push(`\tmov\t\trcx, [rbx]`);   // rcx 变量的值
        } else {
            nasm.push(`\tmov\t\trcx, ${v2}`);   // rdx 变量1的值
        }
        if(f3) {
            nasm.push(`\tmov\t\trbx, ${v3}`);   // rbx 变量地址
            nasm.push(`\tmov\t\trdx, [rbx]`);   // rcx 变量的值
        } else {
            nasm.push(`\tmov\t\trdx, ${v3}`);   // rdx 变量2的值
        }
        nasm.push(`\tsub\t\trcx, rdx`);     // rcx <- rcx + rdx
        if(f4) {
            nasm.push(`\tmov\t\trbx, ${v4}`);   // rbx 变量地址
            nasm.push(`\tmov\t\t[rbx], rcx`);   // 写入目标变量
        } else {
            nasm.push(`\tmov\t\t${v4}, rcx`);   // 写入目标变量
        }
    } else if(p1 === '*') {
        if(f2) {
            nasm.push(`\tmov\t\trbx, ${v2}`);   // rbx 变量地址
            nasm.push(`\tmov\t\trcx, [rbx]`);   // rcx 变量的值
        } else {
            nasm.push(`\tmov\t\trcx, ${v2}`);   // rdx 变量1的值
        }
        if(f3) {
            nasm.push(`\tmov\t\trbx, ${v3}`);   // rbx 变量地址
            nasm.push(`\tmov\t\trdx, [rbx]`);   // rcx 变量的值
        } else {
            nasm.push(`\tmov\t\trdx, ${v3}`);   // rdx 变量2的值
        }
        nasm.push(`\timul\trcx, rdx`);     // rcx <- rcx + rdx
        if(f4) {
            nasm.push(`\tmov\t\trbx, ${v4}`);   // rbx 变量地址
            nasm.push(`\tmov\t\t[rbx], rcx`);   // 写入目标变量
        } else {
            nasm.push(`\tmov\t\t${v4}, rcx`);   // 写入目标变量
        }
    } else if(p1 === '/') {
        if(f2) {
            nasm.push(`\tmov\t\trbx, ${v2}`);   // rbx 变量地址
            nasm.push(`\tmov\t\trax, [rbx]`);   // rdx:rax 变量1的值
        } else {
            nasm.push(`\tmov\t\trax, ${v2}`);   // rdx:rax 变量1的值
        }
        nasm.push(`\tmov\t\trdx, rax`);     // rdx <- rax
        nasm.push(`\tsar\t\trdx, 32`);      // 算数右移32位，保持符号位

        if(f3) {
            nasm.push(`\tmov\t\trbx, ${v3}`);   // rbx 变量地址
            nasm.push(`\tmov\t\trcx, [rbx]`);   // rcx 变量的值
        } else {
            nasm.push(`\tmov\t\trcx, ${v3}`);   // rdx 变量2的值
        }

        nasm.push(`\tidiv\trcx`);           // rax <- rdx:rax / rcx

        if(f4) {
            nasm.push(`\tmov\t\trbx, ${v4}`);   // rbx 变量地址
            nasm.push(`\tmov\t\t[rbx], rax`);   // 写入目标变量
        } else {
            nasm.push(`\tmov\t\t${v4}, rax`);   // 写入目标变量
        }
    } else if(p1 === 'jl') {
        if(f2) {
            nasm.push(`\tmov\t\trbx, ${v2}`);   // rbx 变量地址
            nasm.push(`\tmov\t\trcx, [rbx]`);   // rcx 变量的值
        } else {
            nasm.push(`\tmov\t\trcx, ${v2}`);   // rdx 变量1的值
        }
        if(f3) {
            nasm.push(`\tmov\t\trbx, ${v3}`);   // rbx 变量地址
            nasm.push(`\tmov\t\trdx, [rbx]`);   // rcx 变量的值
        } else {
            nasm.push(`\tmov\t\trdx, ${v3}`);   // rdx 变量2的值
        }

        nasm.push(`\tcmp\t\trcx, rdx`);     // 比较 rcx 和 rdx
        nasm.push(`\tjl\t\t${p4}`);         // rbx 目标变量地址
    } else if(p1 === 'jle') {
        if(f2) {
            nasm.push(`\tmov\t\trbx, ${v2}`);   // rbx 变量地址
            nasm.push(`\tmov\t\trcx, [rbx]`);   // rcx 变量的值
        } else {
            nasm.push(`\tmov\t\trcx, ${v2}`);   // rdx 变量1的值
        }
        if(f3) {
            nasm.push(`\tmov\t\trbx, ${v3}`);   // rbx 变量地址
            nasm.push(`\tmov\t\trdx, [rbx]`);   // rcx 变量的值
        } else {
            nasm.push(`\tmov\t\trdx, ${v3}`);   // rdx 变量2的值
        }

        nasm.push(`\tcmp\t\trcx, rdx`);     // 比较 rcx 和 rdx
        nasm.push(`\tjle\t\t${p4}`);        // rbx 目标变量地址
    } else if(p1 === 'jg') {
        if(f2) {
            nasm.push(`\tmov\t\trbx, ${v2}`);   // rbx 变量地址
            nasm.push(`\tmov\t\trcx, [rbx]`);   // rcx 变量的值
        } else {
            nasm.push(`\tmov\t\trcx, ${v2}`);   // rdx 变量1的值
        }
        if(f3) {
            nasm.push(`\tmov\t\trbx, ${v3}`);   // rbx 变量地址
            nasm.push(`\tmov\t\trdx, [rbx]`);   // rcx 变量的值
        } else {
            nasm.push(`\tmov\t\trdx, ${v3}`);   // rdx 变量2的值
        }

        nasm.push(`\tcmp\t\trcx, rdx`);     // 比较 rcx 和 rdx
        nasm.push(`\tjg\t\t${p4}`);         // rbx 目标变量地址
    } else if(p1 === 'jge') {
        if(f2) {
            nasm.push(`\tmov\t\trbx, ${v2}`);   // rbx 变量地址
            nasm.push(`\tmov\t\trcx, [rbx]`);   // rcx 变量的值
        } else {
            nasm.push(`\tmov\t\trcx, ${v2}`);   // rdx 变量1的值
        }
        if(f3) {
            nasm.push(`\tmov\t\trbx, ${v3}`);   // rbx 变量地址
            nasm.push(`\tmov\t\trdx, [rbx]`);   // rcx 变量的值
        } else {
            nasm.push(`\tmov\t\trdx, ${v3}`);   // rdx 变量2的值
        }

        nasm.push(`\tcmp\t\trcx, rdx`);     // 比较 rcx 和 rdx
        nasm.push(`\tjge\t\t${p4}`);        // rbx 目标变量地址
    } else if(p1 === 'je') {
        if(f2) {
            nasm.push(`\tmov\t\trbx, ${v2}`);   // rbx 变量地址
            nasm.push(`\tmov\t\trcx, [rbx]`);   // rcx 变量的值
        } else {
            nasm.push(`\tmov\t\trcx, ${v2}`);   // rdx 变量1的值
        }
        if(f3) {
            nasm.push(`\tmov\t\trbx, ${v3}`);   // rbx 变量地址
            nasm.push(`\tmov\t\trdx, [rbx]`);   // rcx 变量的值
        } else {
            nasm.push(`\tmov\t\trdx, ${v3}`);   // rdx 变量2的值
        }

        nasm.push(`\tcmp\t\trcx, rdx`);     // 比较 rcx 和 rdx
        nasm.push(`\tje\t\t${p4}`);         // rbx 目标变量地址
    } else if(p1 === 'jne') {
        if(f2) {
            nasm.push(`\tmov\t\trbx, ${v2}`);   // rbx 变量地址
            nasm.push(`\tmov\t\trcx, [rbx]`);   // rcx 变量的值
        } else {
            nasm.push(`\tmov\t\trcx, ${v2}`);   // rdx 变量1的值
        }
        if(f3) {
            nasm.push(`\tmov\t\trbx, ${v3}`);   // rbx 变量地址
            nasm.push(`\tmov\t\trdx, [rbx]`);   // rcx 变量的值
        } else {
            nasm.push(`\tmov\t\trdx, ${v3}`);   // rdx 变量2的值
        }

        nasm.push(`\tcmp\t\trcx, rdx`);     // 比较 rcx 和 rdx
        nasm.push(`\tjne\t\t${p4}`);        // rbx 目标变量地址
    } else if(p1 === 'goto') {
        nasm.push(`\tjmp\t\t${p4}`);        // rbx 目标变量地址
    } else if(p1 === 'assign') {
        if(f2) {
            nasm.push(`\tmov\t\trbx, ${v2}`);   // rbx 变量地址
            nasm.push(`\tmov\t\trcx, [rbx]`);   // rcx 变量的值
        } else {
            nasm.push(`\tmov\t\trcx, ${v2}`);   // rdx 变量的值
        }

        if(f4) {
            nasm.push(`\tmov\t\trbx, ${v4}`);   // rbx 变量地址
            nasm.push(`\tmov\t\t[rbx], rcx`);   // rcx 变量的值
        } else {
            nasm.push(`\tmov\t\t${v4}, rcx`);   // rdx 变量2的值
        }
    } else if(p1 === 'param') {
        if(f2) {
            nasm.push(`\tmov\t\trbx, ${v2}`);   // rbx 变量地址
            nasm.push(`\tmov\t\trcx, [rbx]`);   // rcx 变量的值
        } else {
            nasm.push(`\tmov\t\trcx, ${v2}`);   // rdx 变量的值
        }

        nasm.push(`\tpush\tqword\trcx`);    // 压栈变量
    } else if(p1 === 'call') {
        nasm.push(`\tcall\t${p2}`);         // 压栈变量
        // console.log(p2, this._funcVarNum.get(p2))
        if(this._funcVarNum.get(p2)[0] !== 0) {
            nasm.push(`\tadd\t\trsp, ${8*this._funcVarNum.get(p2)[0]}`);   // rbx 变量地址
        }

        if(p4 !== '') {
            if(f4) {
                nasm.push(`\tmov\t\trbx, ${v4}`);   // rbx 变量地址
                nasm.push(`\tmov\t\t[rbx], rax`);   // 变量 <- rax
            } else {
                nasm.push(`\tmov\t\t${v4}, rax`);   // 变量 <- rax
            }
        }
        
    } else if(p1 === 'ret') {
        if(p2 !== '') {
            if(f2) {
                nasm.push(`\tmov\t\trbx, ${v2}`);   // rbx 变量地址
                nasm.push(`\tmov\t\trax, [rbx]`);
            } else {
                nasm.push(`\tmov\t\trax, ${v2}`);
            }
        }
        nasm.push(`\tmov\t\trsp, rbp`);
        nasm.push(`\tpop\t\trbp`);
        nasm.push(`\tret`);                 // ret
    } else if(p1 === 'func') {
        nasm.push(`${p4}:`);                // function
    } else if(p1 === 'label') {
        nasm.push(`${p4}:`);                // label
    }

    return nasm;
};

/**
 * 将全局变量的中间代码翻译成汇编代码（NASM 格式）
 * @public
 * @return {Array}
 */
CodeGen.prototype._translateGlobal = function() {
    if(!this._global) {
        throw new Error('CodeGen._global is empty');
    }

    const dataNasm = new Array();
    const bssNasm = new Array();
    let startNasm = new Array();
    let i = 0;

    // nasm.push(`global start`);
    // nasm.push('');

    // nasm.push(`section .data`);
    while(i < this._global.length) {
        eachIR = this._global[i];
        if(eachIR[0] !== 'data') {
            break;
        }

        globalVars.add(eachIR[1]);

        let dataName = eachIR[1] + ':';
        if(dataName.length >= 4) { dataName += '\t' }
        else { dataName += '\t\t' }
        
        dataNasm.push(`\t${dataName}dq\t${eachIR[2]}`);
        i++;
    }
    this._data = dataNasm;
    
    // nasm.push(`section .bss`);
    while(i < this._global.length) {
        eachIR = this._global[i];
        if(eachIR[0] !== 'bss') {
            break;
        }

        globalVars.add(eachIR[1]);

        let bssName = eachIR[1] + ':';
        if(bssName.length >= 4) { bssName += '\t' }
        else { bssName += '\t\t' }

        bssNasm.push(`\t${bssName}resq\t1`);
        i++;
    }
    this._bss = bssNasm;

    startNasm.push(`start:`);
    while(i < this._global.length) {
        eachIR = this._global[i];
        
        const IRNasm = this._translateOneIR(eachIR);
        startNasm = startNasm.concat(IRNasm);
        i++;
    }

    startNasm.push(`\tcall\t_main`);
    startNasm.push(`\tmov\t\trax, 0x2000001`);
    startNasm.push(`\tmov\t\trdi, 0`);
    startNasm.push(`\tsyscall`);

    this._text.push(startNasm);
    // nasm.push('');
};

const writeBack = (reg, varName) => {
    const varType = getVarType(varName);
    const wbNasm = new Array();

    if(varType.type === 'fparam') {   
        wbNasm.push(`\tmov\t\t[rbp+${8+8*varType.address}], ${reg}`);
    } else if(varType.type === 'flocal') {
        wbNasm.push(`\tmov\t\t[rbp-${8*varType.address}], ${reg}`);
    } else {
        if(isNaN(parseInt(varName))) {
            wbNasm.push(`\tmov\t\trbx, ${varName}`);
            wbNasm.push(`\tmov\t\t[rbx], ${reg}`);
        }
    }

    if(!varName) {
        throw new Error(1);
    }

    return wbNasm;
};

/**
 * 将一个基本块的中间代码翻译成汇编代码（NASM 格式）
 * 考虑寄存器分配
 * @public
 * @return {Array}
 */
CodeGen.prototype._translateBlockWithRegAlloc = function(blockIR, alloc, startLive, endLive) {
    let nasm = new Array();
    const regSet = new Set(['rcx', 'rdx', 'r8', 'r9', 'r10', 'r11', 'r12', 'r13', 'r14', 'r15']);
    let regMap = new Map(); // 记录每个寄存器中储存的变量情况
    for(let r of regSet) {
        regMap.set(r, '');
    }
    for(let v of startLive) {
        regMap.set(alloc.get(v), v);
    } // 至此，regMap 储存了进入这个 block 时，可以确定的某些寄存器储存的值

    for(let IR of blockIR) {
        const [p1, p2, p3, p4] = IR;
        const varType2 = getVarType(p2);
        const varType3 = getVarType(p3);
        const varType4 = getVarType(p4);
        let v2, v3, v4;

        const op2Nasm = new Array();
        const op3Nasm = new Array();
        const resNasm = new Array();
        let wb2 = new Array();
        let wb3 = new Array();
        let wbRes = new Array();

        v2 = 'rbx';
        if(varType2.type === 'fparam') {
            if(alloc.has(p2)) {
                v2 = alloc.get(p2); // 这个变量分配的寄存器
            }

            if(regMap.get(v2) !== p2 && v2 !== 'rbx' && regMap.get(v2) !== '') { // 如果这个寄存器中储存的不是这个变量
                wb2 = writeBack(v2, regMap.get(v2));
                op2Nasm.push(`\tmov\t\t${v2}, [rbp+${8+8*varType2.address}]`);
                regMap.set(v2, p2);
            }
        } else if(varType2.type === 'flocal') {
            if(alloc.has(p2)) {
                v2 = alloc.get(p2); // 这个变量分配的寄存器
            }

            if(regMap.get(v2) !== p2 && v2 !== 'rbx' && regMap.get(v2) !== '') { // 如果这个寄存器中储存的不是这个变量
                wb2 = writeBack(v2, regMap.get(v2));
                op2Nasm.push(`\tmov\t\t${v2}, [rbp-${8*varType2.address}]`);
                regMap.set(v2, p2);
            }
        } else {
            if(isNaN(parseInt(p2))) {
                if(alloc.has(p2)) {
                    v2 = alloc.get(p2); // 这个变量分配的寄存器
                }
    
                if(regMap.get(v2) !== p2 && v2 !== 'rbx' && regMap.get(v2) !== '') { // 如果这个寄存器中储存的不是这个变量
                    wb2 = writeBack(v2, regMap.get(v2));
                    op2Nasm.push(`\tmov\t\trbx, ${p2}`);
                    op2Nasm.push(`\tmov\t\t${v2}, [rbx]`);
                    regMap.set(v2, p2);
                }
            } else {
                v2 = p2;
            }
            // f2 = true;
        }

        v3 = 'rbx';
        if(varType3.type === 'fparam') {
            if(alloc.has(p3)) {
                v3 = alloc.get(p3); // 这个变量分配的寄存器
            }

            if(regMap.get(v3) !== p3 && v3 !== 'rbx' && regMap.get(v3) !== '') { // 如果这个寄存器中储存的不是这个变量
                wb3 = writeBack(v3, regMap.get(v3));
                op3Nasm.push(`\tmov\t\t${v3}, [rbp+${8+8*varType3.address}]`);
                regMap.set(v3, p3);
            }
        } else if(varType3.type === 'flocal') {
            if(alloc.has(p3)) {
                v3 = alloc.get(p3); // 这个变量分配的寄存器
            }

            if(regMap.get(v3) !== p3 && v3 !== 'rbx' && regMap.get(v3) !== '') { // 如果这个寄存器中储存的不是这个变量
                wb3 = writeBack(v3, regMap.get(v3));
                op3Nasm.push(`\tmov\t\t${v3}, [rbp-${8*varType3.address}]`);
                regMap.set(v3, p3);
            }
        } else {
            if(isNaN(parseInt(p3))) {
                if(alloc.has(p3)) {
                    v3 = alloc.get(p3); // 这个变量分配的寄存器
                }
    
                if(regMap.get(v3) !== p3 && v3 !== 'rbx' && regMap.get(v3) !== '') { // 如果这个寄存器中储存的不是这个变量
                    wb3 = writeBack(v3, regMap.get(v3));
                    op3Nasm.push(`\tmov\t\trbx, ${p3}`);
                    op3Nasm.push(`\tmov\t\t${v3}, [rbx]`);
                    regMap.set(v3, p3);
                }
            } else {
                v3 = p3;
            }
            // f3 = true;
        }

        v4 = 'rbx';
        if(varType4.type === 'fparam') {
            if(alloc.has(p4)) {
                v4 = alloc.get(p4); // 这个变量分配的寄存器
            }

            if(regMap.get(v4) !== p4) { // 如果这个寄存器中储存的不是这个变量
                wbRes = writeBack(v4, regMap.get(v4));
                // op4Nasm.push(`\tmov\t\t${v4}, [rbp+${8+8*varType4.address}]`);
                regMap.set(v4, p4);
            }
        } else if(varType4.type === 'flocal') {
            if(alloc.has(p4)) {
                v4 = alloc.get(p4); // 这个变量分配的寄存器
            }

            if(regMap.get(v4) !== p4 && v4 !== 'rbx' && regMap.get(v4) !== '') { // 如果这个寄存器中储存的不是这个变量
                wbRes = writeBack(v4, regMap.get(v4));
                // op4Nasm.push(`\tmov\t\t${v4}, [rbp-${8*varType4.address}]`);
                regMap.set(v4, p4);
            }
        } else {
            if(isNaN(parseInt(p4))) {
                if(alloc.has(p4)) {
                    v4 = alloc.get(p4); // 这个变量分配的寄存器
                }
    
                if(regMap.get(v4) !== p4 && v4 !== 'rbx' && regMap.get(v4) !== '') { // 如果这个寄存器中储存的不是这个变量
                    wbRes = writeBack(v4, regMap.get(v4));
                    // op4Nasm.push(`\tmov\t\trbx, ${p4}`);
                    // op4Nasm.push(`\tmov\t\t${v4}, [rbx]`);
                    regMap.set(v4, p4);
                }
            } else {
                throw new Error('check CodeGen.js line 587');
            }
        }
        
        // 此时 v2, v3, v4 中已经存放好了可以使用的寄存器
        if(p1 === 'uminus') {
            nasm = nasm.concat(wb2);
            nasm = nasm.concat(op2Nasm);
            
            if(v2 === v4) {
                nasm = nasm.concat(wbRes);
                nasm.push(`\tmov\t\t${v4}, ${v2}`);
                nasm.push(`\tneg\t\t${v4}`);
            } else {
                nasm = nasm.concat(wbRes);
                nasm.push(`\tmov\t\t${v4}, ${v2}`);
                nasm.push(`\tneg\t\t${v4}`);
            }
        } else if(p1 === '+') {
            nasm = nasm.concat(wb2);
            nasm = nasm.concat(op2Nasm);

            nasm = nasm.concat(wb3);
            nasm = nasm.concat(op3Nasm);
            
            nasm = nasm.concat(wbRes);
            nasm.push(`\tmov\t\t${v4}, ${v2}`);
            nasm.push(`\tadd\t\t${v4}, ${v3}`);
        } else if(p1 === '-') {
            nasm = nasm.concat(wb2);
            nasm = nasm.concat(op2Nasm);

            nasm = nasm.concat(wb3);
            nasm = nasm.concat(op3Nasm);
            
            nasm = nasm.concat(wbRes);
            nasm.push(`\tmov\t\t${v4}, ${v2}`);
            nasm.push(`\tsub\t\t${v4}, ${v3}`);
        } else if(p1 === '*') {
            nasm = nasm.concat(wb2);
            nasm = nasm.concat(op2Nasm);

            nasm = nasm.concat(wb3);
            nasm = nasm.concat(op3Nasm);
            
            nasm = nasm.concat(wbRes);
            nasm.push(`\tmov\t\t${v4}, ${v2}`);
            nasm.push(`\timul\t${v4}, ${v3}`);
        } else if(p1 === '/') {
            nasm = nasm.concat(wb2);
            nasm = nasm.concat(op2Nasm);

            nasm = nasm.concat(wb3);
            nasm = nasm.concat(op3Nasm);

            nasm = nasm.concat(wbRes);

            // if(f2) {
            //     nasm.push(`\tmov\t\trbx, ${v2}`);   // rbx 变量地址
            //     nasm.push(`\tmov\t\trax, [rbx]`);   // rdx:rax 变量1的值
            // } else {
            //     nasm.push(`\tmov\t\trax, ${v2}`);   // rdx:rax 变量1的值
            // }
            nasm.push(`\tpush\trax`);
            nasm.push(`\tmov\t\trax, ${v2}`);   // rdx:rax 变量1的值
            nasm.push(`\tpush\trdx`);
            nasm.push(`\tmov\t\trdx, rax`);     // rdx <- rax
            nasm.push(`\tsar\t\trdx, 32`);      // 算数右移32位，保持符号位

            nasm.push(`\tpush\trcx`);            
            nasm.push(`\tmov\t\trcx, ${v3}`);     // rdx <- rax
            nasm.push(`\tidiv\trcx`);           // rax <- rdx:rax / rcx
            nasm.push(`\tpop\t\trcx`);

            nasm.push(`\tmov\t\t${v4}, rax`);
            nasm.push(`\tpop\t\trdx`);
            nasm.push(`\tpop\t\trax`);
        } else if(p1 === 'jl') {
            nasm = nasm.concat(wb2);
            nasm = nasm.concat(op2Nasm);

            nasm = nasm.concat(wb3);
            nasm = nasm.concat(op3Nasm);

            nasm.push(`\tcmp\t\t${v2}, ${v3}`);     // 比较 rcx 和 rdx
            nasm.push(`\tjl\t\t${p4}`);         // rbx 目标变量地址
        } else if(p1 === 'jle') {
            nasm = nasm.concat(wb2);
            nasm = nasm.concat(op2Nasm);

            nasm = nasm.concat(wb3);
            nasm = nasm.concat(op3Nasm);

            nasm.push(`\tcmp\t\t${v2}, ${v3}`);     // 比较 rcx 和 rdx
            nasm.push(`\tjle\t\t${p4}`);        // rbx 目标变量地址
        } else if(p1 === 'jg') {
            nasm = nasm.concat(wb2);
            nasm = nasm.concat(op2Nasm);

            nasm = nasm.concat(wb3);
            nasm = nasm.concat(op3Nasm);

            nasm.push(`\tcmp\t\t${v2}, ${v3}`);     // 比较 rcx 和 rdx
            nasm.push(`\tjg\t\t${p4}`);         // rbx 目标变量地址
        } else if(p1 === 'jge') {
            nasm = nasm.concat(wb2);
            nasm = nasm.concat(op2Nasm);

            nasm = nasm.concat(wb3);
            nasm = nasm.concat(op3Nasm);

            nasm.push(`\tcmp\t\t${v2}, ${v3}`);     // 比较 rcx 和 rdx
            nasm.push(`\tjge\t\t${p4}`);        // rbx 目标变量地址
        } else if(p1 === 'je') {
            nasm = nasm.concat(wb2);
            nasm = nasm.concat(op2Nasm);

            nasm = nasm.concat(wb3);
            nasm = nasm.concat(op3Nasm);

            nasm.push(`\tcmp\t\t${v2}, ${v3}`);     // 比较 rcx 和 rdx
            nasm.push(`\tje\t\t${p4}`);         // rbx 目标变量地址
        } else if(p1 === 'jne') {
            nasm = nasm.concat(wb2);
            nasm = nasm.concat(op2Nasm);

            nasm = nasm.concat(wb3);
            nasm = nasm.concat(op3Nasm);

            nasm.push(`\tcmp\t\t${v2}, ${v3}`);     // 比较 rcx 和 rdx
            nasm.push(`\tjne\t\t${p4}`);        // rbx 目标变量地址
        } else if(p1 === 'goto') {
            nasm.push(`\tjmp\t\t${p4}`);        // rbx 目标变量地址
        } else if(p1 === 'assign') {
            nasm = nasm.concat(wb2);
            nasm = nasm.concat(op2Nasm);
            
            if(v2 === v4) {
                nasm = nasm.concat(wbRes);
                nasm.push(`\tmov\t\t${v4}, ${v2}`);
            } else {
                nasm = nasm.concat(wbRes);
                nasm.push(`\tmov\t\t${v4}, ${v2}`);
            }
        } else if(p1 === 'param') {
            nasm = nasm.concat(wb2);
            nasm = nasm.concat(op2Nasm);

            nasm.push(`\tpush\tqword\t${v2}`);    // 压栈变量
        } else if(p1 === 'call') {
            nasm.push(`\tcall\t${p2}`);         // 压栈变量
            // console.log(p2, this._funcVarNum.get(p2))
            if(this._funcVarNum.get(p2)[0] !== 0) {
                nasm.push(`\tadd\t\trsp, ${8*this._funcVarNum.get(p2)[0]}`);   // rbx 变量地址
            }

            if(p4 !== '') {
                nasm = nasm.concat(wbRes);
                nasm.push(`\tmov\t\t${v4}, rax`);
            }
            
        } else if(p1 === 'ret') {
            nasm = nasm.concat(wb2);
            nasm = nasm.concat(op2Nasm);
            nasm.push(`\tmov\t\trax, ${v2}`);

            nasm.push(`\tmov\t\trsp, rbp`);
            nasm.push(`\tpop\t\trbp`);
            nasm.push(`\tret`);                 // ret
        } else if(p1 === 'func') {
            nasm.push(`${p4}:`);                // function
        } else if(p1 === 'label') {
            nasm.push(`${p4}:`);                // label
        }
    }

    for(let v of endLive) {
        const r = alloc.get(v);
        if(regMap.get(r) !== v) {
            nasm = nasm.concat(writeBack(r, v));
        }
    }

    return nasm;
};

/**
 * 将函数的中间代码翻译成汇编代码（NASM 格式）
 * @public
 * @return {Array}
 */
CodeGen.prototype._translateFunc = function() {
    if(!this._funcs) {
        throw new Error('CodeGen._global is empty');
    }

    // for(let IR of this._funcs) {
    //     const allocRes = this._allocRes.get(IR[0][3]);
    //     const allocatedMap = allocRes.allocated;
    //     const unallocatedSet = allocRes.unallocated;
    //     const startLiveInfo = allocRes.startLiveSet;
    //     const endLiveInfo = allocRes.endLiveSet;
    //     const splitIR = GC.splitIR(IR);
    //     // console.log(startLiveInfo.length);
    //     // console.log(endLiveInfo.length);
    //     // console.log(splitIR.blocks.length);


    //     let funcNasm = new Array();
    //     funcNasm = funcNasm.concat(this._translateOneIR(IR[0]));

    //     funcNasm.push(`\tpush\trbp`);
    //     funcNasm.push(`\tmov\t\trbp, rsp`);
    //     funcNasm.push(`\tsub\t\trsp, ${8*this._funcVarNum.get(IR[0][3])[1]}`);

    //     fparamVars = new Map();
    //     flocalVars = new Map();

    //     let fparamCount = 1;
    //     let flocalCount = 1;

    //     let i = 1;
    //     while(i < IR.length) {
    //         eachIR = IR[i];
    //         if(eachIR[0] !== 'fparam') {
    //             break;
    //         }

    //         fparamVars.set(eachIR[1], fparamCount);
    //         fparamCount++;
        
    //         i++;
    //     }

    //     while(i < IR.length) {
    //         eachIR = IR[i];
    //         if(eachIR[0] !== 'flocal') {
    //             break;
    //         }

    //         flocalVars.set(eachIR[1], flocalCount);
    //         flocalCount++;
        
    //         i++;
    //     }

    //     for(let i = 0; i < splitIR.blocks.length; i++) {
    //         const blockIR = splitIR.blocks[i];
    //         const tempNasm = this._translateBlockWithRegAlloc(blockIR, allocatedMap, startLiveInfo[i], endLiveInfo[i]);
    //         funcNasm = funcNasm.concat(tempNasm);
    //     }

    //     this._text.push(funcNasm);
    // }

    if(!this._funcs) {
        throw new Error('CodeGen._global is empty');
    }

    for(let IR of this._funcs) {
        let funcNasm = new Array();
        funcNasm = funcNasm.concat(this._translateOneIR(IR[0]));

        fparamVars = new Map();
        flocalVars = new Map();

        let fparamCount = 1;
        let flocalCount = 1;

        let i = 1;
        while(i < IR.length) {
            eachIR = IR[i];
            if(eachIR[0] !== 'fparam') {
                break;
            }

            fparamVars.set(eachIR[1], fparamCount);
            fparamCount++;
        
            i++;
        }

        while(i < IR.length) {
            eachIR = IR[i];
            if(eachIR[0] !== 'flocal') {
                break;
            }

            flocalVars.set(eachIR[1], flocalCount);
            flocalCount++;
        
            i++;
        }

        funcNasm.push(`\tpush\trbp`);
        funcNasm.push(`\tmov\t\trbp, rsp`);
        funcNasm.push(`\tsub\t\trsp, ${8*this._funcVarNum.get(IR[0][3])[1]}`);
        while(i < IR.length) {
            funcNasm = funcNasm.concat(this._translateOneIR(IR[i]));
            i++;
        }

        this._text.push(funcNasm);

        // if(IR[0][3] === '_main') {
        //     console.log(IR);
        // }
    }
};


/**
 * 加入 IR_Generator.js 中 builtInFuncs 中函数的汇编代码
 * @private
 */
CodeGen.prototype._addBuiltInFuncs = function() {
    const print = new Array();
    print.push('_print:');
    print.push('\tpush\trbp');
    print.push('\tmov\t\trbp, rsp');
    print.push('\tmov\t\trcx, outv');
    print.push('\tmov\t\trdx, qword [rbp+16]');
    print.push('\tmov\t\t[rcx], rdx');
    print.push('\tmov\t\trax, 0x2000004');
    print.push('\tmov\t\trdi, 1');
    print.push('\tmov\t\trsi, outv');
    print.push('\tmov\t\trdx, 1');
    print.push('\tsyscall');
    print.push('\tmov\t\trsp, rbp');
    print.push('\tpop\t\trbp');
    print.push('\tret');

    this._text.push(print);

    const read = new Array();
    read.push('_read:');
    read.push('\tpush\trbp');
    read.push('\tmov\t\trbp, rsp');
    read.push('\tmov\t\trax, 0x2000003');
    read.push('\tmov\t\trdi, 0');
    read.push('\tmov\t\trsi, inv');
    read.push('\tmov\t\trdx, 1');
    read.push('\tsyscall');
    read.push('\tmov\t\trcx, inv');
    read.push('\tmov\t\trax, [rcx]');
    read.push('\tmov\t\trsp, rbp');
    read.push('\tpop\t\trbp');
    read.push('\tret');

    this._text.push(read);
}; 

/**
 * 将中间代码翻译成汇编代码（NASM 格式）
 * @public
 * @return {Array} nasm
 */
CodeGen.prototype.translate = function() {
    if(!this._global || !this._funcs) {
        throw new Error('CodeGen\'sIR is empty');
    }

    this._translateGlobal();
    this._translateFunc();
    this._addBuiltInFuncs();

    this._text = this._text.reverse();

    this._nasm = 'global start\n';

    this._nasm += '\n';
    this._nasm += 'section .data\n';
    for(let each of this._data) {
        this._nasm += each;
        this._nasm += '\n';
    }

    this._nasm += '\n';
    this._nasm += 'section .bss\n';
    for(let each of this._bss) {
        this._nasm += each;
        this._nasm += '\n';
    }

    this._nasm += '\n';
    this._nasm += 'section .text\n';
    for(let func of this._text) {
        for(let each of func) {
            this._nasm += each;
            this._nasm += '\n';
        }
        this._nasm += '\n';
    }

    // console.log(this._text);
    // console.log(this._funcs);
    // console.log(this._data);
    // console.log(this._bss);
};

CodeGen.prototype.showNasm = function() {
    if(!this._bss || !this._data || !this._text) {
        throw new Error('CodeGen\'sIR is empty');
    }

    return this._nasm;
};

module.exports = CodeGen;