(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){

},{}],2:[function(require,module,exports){
'use strict'

exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i]
  revLookup[code.charCodeAt(i)] = i
}

// Support decoding URL-safe base64 strings, as Node.js does.
// See: https://en.wikipedia.org/wiki/Base64#URL_applications
revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function getLens (b64) {
  var len = b64.length

  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // Trim off extra bytes after placeholder bytes are found
  // See: https://github.com/beatgammit/base64-js/issues/42
  var validLen = b64.indexOf('=')
  if (validLen === -1) validLen = len

  var placeHoldersLen = validLen === len
    ? 0
    : 4 - (validLen % 4)

  return [validLen, placeHoldersLen]
}

// base64 is 4/3 + up to two characters of the original data
function byteLength (b64) {
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function _byteLength (b64, validLen, placeHoldersLen) {
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function toByteArray (b64) {
  var tmp
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]

  var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen))

  var curByte = 0

  // if there are placeholders, only get up to the last complete 4 chars
  var len = placeHoldersLen > 0
    ? validLen - 4
    : validLen

  for (var i = 0; i < len; i += 4) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 18) |
      (revLookup[b64.charCodeAt(i + 1)] << 12) |
      (revLookup[b64.charCodeAt(i + 2)] << 6) |
      revLookup[b64.charCodeAt(i + 3)]
    arr[curByte++] = (tmp >> 16) & 0xFF
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 2) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 2) |
      (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 1) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 10) |
      (revLookup[b64.charCodeAt(i + 1)] << 4) |
      (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] +
    lookup[num >> 12 & 0x3F] +
    lookup[num >> 6 & 0x3F] +
    lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp =
      ((uint8[i] << 16) & 0xFF0000) +
      ((uint8[i + 1] << 8) & 0xFF00) +
      (uint8[i + 2] & 0xFF)
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(
      uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)
    ))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    parts.push(
      lookup[tmp >> 2] +
      lookup[(tmp << 4) & 0x3F] +
      '=='
    )
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + uint8[len - 1]
    parts.push(
      lookup[tmp >> 10] +
      lookup[(tmp >> 4) & 0x3F] +
      lookup[(tmp << 2) & 0x3F] +
      '='
    )
  }

  return parts.join('')
}

},{}],3:[function(require,module,exports){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

var K_MAX_LENGTH = 0x7fffffff
exports.kMaxLength = K_MAX_LENGTH

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Print warning and recommend using `buffer` v4.x which has an Object
 *               implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * We report that the browser does not support typed arrays if the are not subclassable
 * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
 * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
 * for __proto__ and has a buggy typed array implementation.
 */
Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport()

if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
    typeof console.error === 'function') {
  console.error(
    'This browser lacks typed array (Uint8Array) support which is required by ' +
    '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
  )
}

function typedArraySupport () {
  // Can typed array instances can be augmented?
  try {
    var arr = new Uint8Array(1)
    arr.__proto__ = {__proto__: Uint8Array.prototype, foo: function () { return 42 }}
    return arr.foo() === 42
  } catch (e) {
    return false
  }
}

Object.defineProperty(Buffer.prototype, 'parent', {
  get: function () {
    if (!(this instanceof Buffer)) {
      return undefined
    }
    return this.buffer
  }
})

Object.defineProperty(Buffer.prototype, 'offset', {
  get: function () {
    if (!(this instanceof Buffer)) {
      return undefined
    }
    return this.byteOffset
  }
})

function createBuffer (length) {
  if (length > K_MAX_LENGTH) {
    throw new RangeError('Invalid typed array length')
  }
  // Return an augmented `Uint8Array` instance
  var buf = new Uint8Array(length)
  buf.__proto__ = Buffer.prototype
  return buf
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new Error(
        'If encoding is specified then the first argument must be a string'
      )
    }
    return allocUnsafe(arg)
  }
  return from(arg, encodingOrOffset, length)
}

// Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
if (typeof Symbol !== 'undefined' && Symbol.species &&
    Buffer[Symbol.species] === Buffer) {
  Object.defineProperty(Buffer, Symbol.species, {
    value: null,
    configurable: true,
    enumerable: false,
    writable: false
  })
}

Buffer.poolSize = 8192 // not used by this implementation

function from (value, encodingOrOffset, length) {
  if (typeof value === 'number') {
    throw new TypeError('"value" argument must not be a number')
  }

  if (isArrayBuffer(value) || (value && isArrayBuffer(value.buffer))) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof value === 'string') {
    return fromString(value, encodingOrOffset)
  }

  return fromObject(value)
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(value, encodingOrOffset, length)
}

// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
// https://github.com/feross/buffer/pull/148
Buffer.prototype.__proto__ = Uint8Array.prototype
Buffer.__proto__ = Uint8Array

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be of type number')
  } else if (size < 0) {
    throw new RangeError('"size" argument must not be negative')
  }
}

function alloc (size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(size).fill(fill, encoding)
      : createBuffer(size).fill(fill)
  }
  return createBuffer(size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(size, fill, encoding)
}

function allocUnsafe (size) {
  assertSize(size)
  return createBuffer(size < 0 ? 0 : checked(size) | 0)
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(size)
}

function fromString (string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('Unknown encoding: ' + encoding)
  }

  var length = byteLength(string, encoding) | 0
  var buf = createBuffer(length)

  var actual = buf.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    buf = buf.slice(0, actual)
  }

  return buf
}

function fromArrayLike (array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  var buf = createBuffer(length)
  for (var i = 0; i < length; i += 1) {
    buf[i] = array[i] & 255
  }
  return buf
}

function fromArrayBuffer (array, byteOffset, length) {
  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('"offset" is outside of buffer bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('"length" is outside of buffer bounds')
  }

  var buf
  if (byteOffset === undefined && length === undefined) {
    buf = new Uint8Array(array)
  } else if (length === undefined) {
    buf = new Uint8Array(array, byteOffset)
  } else {
    buf = new Uint8Array(array, byteOffset, length)
  }

  // Return an augmented `Uint8Array` instance
  buf.__proto__ = Buffer.prototype
  return buf
}

function fromObject (obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    var buf = createBuffer(len)

    if (buf.length === 0) {
      return buf
    }

    obj.copy(buf, 0, 0, len)
    return buf
  }

  if (obj) {
    if (ArrayBuffer.isView(obj) || 'length' in obj) {
      if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
        return createBuffer(0)
      }
      return fromArrayLike(obj)
    }

    if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
      return fromArrayLike(obj.data)
    }
  }

  throw new TypeError('The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object.')
}

function checked (length) {
  // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= K_MAX_LENGTH) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return b != null && b._isBuffer === true
}

Buffer.compare = function compare (a, b) {
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError('Arguments must be Buffers')
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!Array.isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (ArrayBuffer.isView(buf)) {
      buf = Buffer.from(buf)
    }
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (ArrayBuffer.isView(string) || isArrayBuffer(string)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    string = '' + string
  }

  var len = string.length
  if (len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
      case undefined:
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) return utf8ToBytes(string).length // assume utf8
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
// reliably in a browserify context because there could be multiple different
// copies of the 'buffer' package in use. This method works even for Buffer
// instances that were created from another copy of the `buffer` package.
// See: https://github.com/feross/buffer/issues/154
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.toLocaleString = Buffer.prototype.toString

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  if (this.length > 0) {
    str = this.toString('hex', 0, max).match(/.{2}/g).join(' ')
    if (this.length > max) str += ' ... '
  }
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (!Buffer.isBuffer(target)) {
    throw new TypeError('Argument must be a Buffer')
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset  // Coerce to Number.
  if (numberIsNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  var strLen = string.length

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (numberIsNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset >>> 0
    if (isFinite(length)) {
      length = length >>> 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
      : (firstByte > 0xBF) ? 2
      : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256))
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf = this.subarray(start, end)
  // Return an augmented `Uint8Array` instance
  newBuf.__proto__ = Buffer.prototype
  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset + 3] = (value >>> 24)
  this[offset + 2] = (value >>> 16)
  this[offset + 1] = (value >>> 8)
  this[offset] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  this[offset + 2] = (value >>> 16)
  this[offset + 3] = (value >>> 24)
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!Buffer.isBuffer(target)) throw new TypeError('argument should be a Buffer')
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('Index out of range')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start

  if (this === target && typeof Uint8Array.prototype.copyWithin === 'function') {
    // Use built-in when available, missing from IE11
    this.copyWithin(targetStart, start, end)
  } else if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (var i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, end),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if ((encoding === 'utf8' && code < 128) ||
          encoding === 'latin1') {
        // Fast path: If `val` fits into a single byte, use that numeric value.
        val = code
      }
    }
  } else if (typeof val === 'number') {
    val = val & 255
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : new Buffer(val, encoding)
    var len = bytes.length
    if (len === 0) {
      throw new TypeError('The value "' + val +
        '" is invalid for argument "value"')
    }
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node takes equal signs as end of the Base64 encoding
  str = str.split('=')[0]
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = str.trim().replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

// ArrayBuffers from another context (i.e. an iframe) do not pass the `instanceof` check
// but they should be treated as valid. See: https://github.com/feross/buffer/issues/166
function isArrayBuffer (obj) {
  return obj instanceof ArrayBuffer ||
    (obj != null && obj.constructor != null && obj.constructor.name === 'ArrayBuffer' &&
      typeof obj.byteLength === 'number')
}

function numberIsNaN (obj) {
  return obj !== obj // eslint-disable-line no-self-compare
}

},{"base64-js":2,"ieee754":4}],4:[function(require,module,exports){
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = (e * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = (m * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = ((value * c) - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],5:[function(require,module,exports){
(function (process){
// .dirname, .basename, and .extname methods are extracted from Node.js v8.11.1,
// backported and transplited with Babel, with backwards-compat fixes

// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length - 1; i >= 0; i--) {
    var last = parts[i];
    if (last === '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
  var resolvedPath = '',
      resolvedAbsolute = false;

  for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
    var path = (i >= 0) ? arguments[i] : process.cwd();

    // Skip empty and invalid entries
    if (typeof path !== 'string') {
      throw new TypeError('Arguments to path.resolve must be strings');
    } else if (!path) {
      continue;
    }

    resolvedPath = path + '/' + resolvedPath;
    resolvedAbsolute = path.charAt(0) === '/';
  }

  // At this point the path should be resolved to a full absolute path, but
  // handle relative paths to be safe (might happen when process.cwd() fails)

  // Normalize the path
  resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
  var isAbsolute = exports.isAbsolute(path),
      trailingSlash = substr(path, -1) === '/';

  // Normalize the path
  path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }

  return (isAbsolute ? '/' : '') + path;
};

// posix version
exports.isAbsolute = function(path) {
  return path.charAt(0) === '/';
};

// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    if (typeof p !== 'string') {
      throw new TypeError('Arguments to path.join must be strings');
    }
    return p;
  }).join('/'));
};


// path.relative(from, to)
// posix version
exports.relative = function(from, to) {
  from = exports.resolve(from).substr(1);
  to = exports.resolve(to).substr(1);

  function trim(arr) {
    var start = 0;
    for (; start < arr.length; start++) {
      if (arr[start] !== '') break;
    }

    var end = arr.length - 1;
    for (; end >= 0; end--) {
      if (arr[end] !== '') break;
    }

    if (start > end) return [];
    return arr.slice(start, end - start + 1);
  }

  var fromParts = trim(from.split('/'));
  var toParts = trim(to.split('/'));

  var length = Math.min(fromParts.length, toParts.length);
  var samePartsLength = length;
  for (var i = 0; i < length; i++) {
    if (fromParts[i] !== toParts[i]) {
      samePartsLength = i;
      break;
    }
  }

  var outputParts = [];
  for (var i = samePartsLength; i < fromParts.length; i++) {
    outputParts.push('..');
  }

  outputParts = outputParts.concat(toParts.slice(samePartsLength));

  return outputParts.join('/');
};

exports.sep = '/';
exports.delimiter = ':';

exports.dirname = function (path) {
  if (typeof path !== 'string') path = path + '';
  if (path.length === 0) return '.';
  var code = path.charCodeAt(0);
  var hasRoot = code === 47 /*/*/;
  var end = -1;
  var matchedSlash = true;
  for (var i = path.length - 1; i >= 1; --i) {
    code = path.charCodeAt(i);
    if (code === 47 /*/*/) {
        if (!matchedSlash) {
          end = i;
          break;
        }
      } else {
      // We saw the first non-path separator
      matchedSlash = false;
    }
  }

  if (end === -1) return hasRoot ? '/' : '.';
  if (hasRoot && end === 1) {
    // return '//';
    // Backwards-compat fix:
    return '/';
  }
  return path.slice(0, end);
};

function basename(path) {
  if (typeof path !== 'string') path = path + '';

  var start = 0;
  var end = -1;
  var matchedSlash = true;
  var i;

  for (i = path.length - 1; i >= 0; --i) {
    if (path.charCodeAt(i) === 47 /*/*/) {
        // If we reached a path separator that was not part of a set of path
        // separators at the end of the string, stop now
        if (!matchedSlash) {
          start = i + 1;
          break;
        }
      } else if (end === -1) {
      // We saw the first non-path separator, mark this as the end of our
      // path component
      matchedSlash = false;
      end = i + 1;
    }
  }

  if (end === -1) return '';
  return path.slice(start, end);
}

// Uses a mixed approach for backwards-compatibility, as ext behavior changed
// in new Node.js versions, so only basename() above is backported here
exports.basename = function (path, ext) {
  var f = basename(path);
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};

exports.extname = function (path) {
  if (typeof path !== 'string') path = path + '';
  var startDot = -1;
  var startPart = 0;
  var end = -1;
  var matchedSlash = true;
  // Track the state of characters (if any) we see before our first dot and
  // after any path separator we find
  var preDotState = 0;
  for (var i = path.length - 1; i >= 0; --i) {
    var code = path.charCodeAt(i);
    if (code === 47 /*/*/) {
        // If we reached a path separator that was not part of a set of path
        // separators at the end of the string, stop now
        if (!matchedSlash) {
          startPart = i + 1;
          break;
        }
        continue;
      }
    if (end === -1) {
      // We saw the first non-path separator, mark this as the end of our
      // extension
      matchedSlash = false;
      end = i + 1;
    }
    if (code === 46 /*.*/) {
        // If this is our first dot, mark it as the start of our extension
        if (startDot === -1)
          startDot = i;
        else if (preDotState !== 1)
          preDotState = 1;
    } else if (startDot !== -1) {
      // We saw a non-dot and non-path separator before our dot, so we should
      // have a good chance at having a non-empty extension
      preDotState = -1;
    }
  }

  if (startDot === -1 || end === -1 ||
      // We saw a non-dot character immediately before the dot
      preDotState === 0 ||
      // The (right-most) trimmed path component is exactly '..'
      preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
    return '';
  }
  return path.slice(startDot, end);
};

function filter (xs, f) {
    if (xs.filter) return xs.filter(f);
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (f(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// String.prototype.substr - negative index don't work in IE8
var substr = 'ab'.substr(-1) === 'b'
    ? function (str, start, len) { return str.substr(start, len) }
    : function (str, start, len) {
        if (start < 0) start = str.length + start;
        return str.substr(start, len);
    }
;

}).call(this,require('_process'))
},{"_process":6}],6:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],7:[function(require,module,exports){
/*
 * Copyright 2018 Uber Technologies, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// Define the C bindings for the h3 library

// Add some aliases to make the function definitions more intelligible
var NUMBER = 'number';
var BOOLEAN = NUMBER;
var H3_LOWER = NUMBER;
var H3_UPPER = NUMBER;
var RESOLUTION = NUMBER;
var POINTER = NUMBER;

// Define the bindings to functions in the C lib. Functions are defined as
// [name, return type, [arg types]]. You must run `npm run build-emscripten`
// before new functions added here will be available.
module.exports = [
    // The size functions are inserted via build/sizes.h
    ['sizeOfH3Index', NUMBER],
    ['sizeOfGeoCoord', NUMBER],
    ['sizeOfGeoBoundary', NUMBER],
    ['sizeOfGeoPolygon', NUMBER],
    ['sizeOfGeofence', NUMBER],
    ['sizeOfLinkedGeoPolygon', NUMBER],
    // The remaining functions are defined in the core lib in h3Api.h
    ['h3IsValid', BOOLEAN, [H3_LOWER, H3_UPPER]],
    ['geoToH3', H3_LOWER, [NUMBER, NUMBER, RESOLUTION]],
    ['h3ToGeo', null, [H3_LOWER, H3_UPPER, POINTER]],
    ['h3ToGeoBoundary', null, [H3_LOWER, H3_UPPER, POINTER]],
    ['maxKringSize', NUMBER, [NUMBER]],
    ['kRing', null, [H3_LOWER, H3_UPPER, NUMBER, POINTER]],
    ['kRingDistances', null, [H3_LOWER, H3_UPPER, NUMBER, POINTER, POINTER]],
    ['hexRing', null, [H3_LOWER, H3_UPPER, NUMBER, POINTER]],
    ['maxPolyfillSize', NUMBER, [POINTER, RESOLUTION]],
    ['polyfill', null, [POINTER, RESOLUTION, POINTER]],
    ['h3SetToLinkedGeo', null, [POINTER, NUMBER, POINTER]],
    ['destroyLinkedPolygon', null, [POINTER]],
    ['compact', NUMBER, [POINTER, POINTER, NUMBER]],
    ['uncompact', NUMBER, [POINTER, NUMBER, POINTER, NUMBER, RESOLUTION]],
    ['maxUncompactSize', NUMBER, [POINTER, NUMBER, RESOLUTION]],
    ['h3IsPentagon', BOOLEAN, [H3_LOWER, H3_UPPER]],
    ['h3IsResClassIII', BOOLEAN, [H3_LOWER, H3_UPPER]],
    ['h3GetBaseCell', NUMBER, [H3_LOWER, H3_UPPER]],
    ['h3ToParent', H3_LOWER, [H3_LOWER, H3_UPPER, RESOLUTION]],
    ['h3ToChildren', null, [H3_LOWER, H3_UPPER, RESOLUTION, POINTER]],
    ['maxH3ToChildrenSize', NUMBER, [H3_LOWER, H3_UPPER, RESOLUTION]],
    ['h3IndexesAreNeighbors', BOOLEAN, [H3_LOWER, H3_UPPER, H3_LOWER, H3_UPPER]],
    ['getH3UnidirectionalEdge', H3_LOWER, [H3_LOWER, H3_UPPER, H3_LOWER, H3_UPPER]],
    ['getOriginH3IndexFromUnidirectionalEdge', H3_LOWER, [H3_LOWER, H3_UPPER]],
    ['getDestinationH3IndexFromUnidirectionalEdge', H3_LOWER, [H3_LOWER, H3_UPPER]],
    ['h3UnidirectionalEdgeIsValid', BOOLEAN, [H3_LOWER, H3_UPPER]],
    ['getH3IndexesFromUnidirectionalEdge', null, [H3_LOWER, H3_UPPER, POINTER]],
    ['getH3UnidirectionalEdgesFromHexagon', null, [H3_LOWER, H3_UPPER, POINTER]],
    ['getH3UnidirectionalEdgeBoundary', null, [H3_LOWER, H3_UPPER, POINTER]],
    ['hexAreaM2', NUMBER, [RESOLUTION]],
    ['hexAreaKm2', NUMBER, [RESOLUTION]],
    ['edgeLengthM', NUMBER, [RESOLUTION]],
    ['edgeLengthKm', NUMBER, [RESOLUTION]],
    ['numHexagons', NUMBER, [RESOLUTION]]
];

},{}],8:[function(require,module,exports){
/*
 * Copyright 2018 Uber Technologies, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var C = require('../out/libh3.1');
var BINDINGS = require('./bindings');

var H3 = {};

// Create the bound functions themselves
BINDINGS.forEach(function bind(def) {
    H3[def[0]] = C.cwrap.apply(C, def);
});

// Alias the hexidecimal base for legibility
var BASE_16 = 16;

// ----------------------------------------------------------------------------
// Byte size imports

var SZ_INT = 4;
var SZ_PTR = 4;
var SZ_DBL = 8;
var SZ_H3INDEX = H3.sizeOfH3Index();
var SZ_GEOCOORD = H3.sizeOfGeoCoord();
var SZ_GEOBOUNDARY = H3.sizeOfGeoBoundary();
var SZ_GEOPOLYGON = H3.sizeOfGeoPolygon();
var SZ_GEOFENCE = H3.sizeOfGeofence();
var SZ_LINKED_GEOPOLYGON = H3.sizeOfLinkedGeoPolygon();

// ----------------------------------------------------------------------------
// Unit constants
var UNITS = {
    m: 'm',
    km: 'km',
    m2: 'm2',
    km2: 'km2'
};

// ----------------------------------------------------------------------------
// Utilities and helpers

/**
 * Convert degrees to radians
 * @param  {Number} deg Value in degrees
 * @return {Number}     Value in radians
 */
function degsToRads(deg) {
    return (deg * Math.PI) / 180;
}

/**
 * Convert radians to degrees
 * @param  {Number} rad Value in radians
 * @return {Number}     Value in degrees
 */
function radsToDegs(rad) {
    return (rad * 180) / Math.PI;
}

/**
 * Ensure a valid latitude value (core H3 lib will return 0-180)
 * @param  {Number} lat Latitude
 * @return {Number}     Constrained latitude
 */
function constrainLat(lat) {
    return lat > 90 ? lat - 180 : lat;
}

/**
 * Ensure a valid longitude value (core H3 lib will return 0-360)
 * @param  {Number} lat Longitude
 * @return {Number}     Constrained longitude
 */
function constrainLng(lng) {
    return lng > 180 ? lng - 360 : lng;
}

/**
 * Validate a resolution, throwing an error if invalid
 * @param  {mixed} res Value to validate
 * @throws {Error}     Error if invalid
 */
function validateRes(res) {
    if (typeof res !== 'number' || res < 0 || res > 15 || Math.floor(res) !== res) {
        throw new Error(("Invalid resolution: " + res));
    }
}

/**
 * Convert an H3 address (64-bit hexidecimal string) into a "split long" - a pair of 32-bit ints
 * @param  {String} h3Address H3 address to check
 * @return {Number[]}         A two-element array with 32 lower bits and 32 upper bits
 */
function h3AddressToSplitLong(h3Address) {
    if (typeof h3Address !== 'string') {
        return [0, 0];
    }
    var upper = parseInt(h3Address.substring(0, h3Address.length - 8), BASE_16);
    var lower = parseInt(h3Address.substring(h3Address.length - 8), BASE_16);
    return [lower, upper];
}

/**
 * Convert a 32-bit int to a hexdecimal string
 * @param  {Number} num Integer to convert
 * @return {String}     Hexidecimal string
 */
function hexFrom32Bit(num) {
    if (num >= 0) {
        return num.toString(BASE_16);
    }

    // Handle negative numbers
    num = num & 0x7fffffff;
    var tempStr = zeroPad(8, num.toString(BASE_16));
    var topNum = (parseInt(tempStr[0], BASE_16) + 8).toString(BASE_16);
    tempStr = topNum + tempStr.substring(1);
    return tempStr;
}

/**
 * Get a H3 address from a split long (pair of 32-bit ints)
 * @param  {Number} lower Lower 32 bits
 * @param  {Number} upper Upper 32 bits
 * @return {String}       H3 address
 */
function splitLongToH3Address(lower, upper) {
    return hexFrom32Bit(upper) + zeroPad(8, hexFrom32Bit(lower));
}

/**
 * Zero-pad a string to a given length
 * @param  {Number} fullLen Target length
 * @param  {String} numStr  String to zero-pad
 * @return {String}         Zero-padded string
 */
function zeroPad(fullLen, numStr) {
    var numZeroes = fullLen - numStr.length;
    var outStr = '';
    for (var i = 0; i < numZeroes; i++) {
        outStr += '0';
    }
    outStr = outStr + numStr;
    return outStr;
}

/**
 * Populate a C-appropriate Geofence struct from a polygon array
 * @param  {Array[]} polygonArray Polygon, as an array of coordinate pairs
 * @param  {Number}  geofence     C pointer to a Geofence struct
 * @param  {Boolean} isGeoJson    Whether coordinates are in [lng, lat] order per GeoJSON spec
 * @return {Number}               C pointer to populated Geofence struct
 */
function polygonArrayToGeofence(polygonArray, geofence, isGeoJson) {
    var numVerts = polygonArray.length;
    var geoCoordArray = C._calloc(numVerts, SZ_GEOCOORD);
    // Support [lng, lat] pairs if GeoJSON is specified
    var latIndex = isGeoJson ? 1 : 0;
    var lngIndex = isGeoJson ? 0 : 1;
    for (var i = 0; i < numVerts * 2; i += 2) {
        C.HEAPF64.set(
            [
                constrainLat(polygonArray[i / 2][latIndex]),
                constrainLng(polygonArray[i / 2][lngIndex])
            ].map(degsToRads),
            geoCoordArray / SZ_DBL + i
        );
    }
    C.HEAPU32.set([numVerts, geoCoordArray], geofence / SZ_INT);
    return geofence;
}

/**
 * Create a C-appropriate GeoPolygon struct from an array of polygons
 * @param  {Array[]} coordinates  Array of polygons, each an array of coordinate pairs
 * @param  {Boolean} isGeoJson    Whether coordinates are in [lng, lat] order per GeoJSON spec
 * @return {Number}               C pointer to populated GeoPolygon struct
 */
function coordinatesToGeoPolygon(coordinates, isGeoJson) {
    // Any loops beyond the first loop are holes
    var numHoles = coordinates.length - 1;
    var geoPolygon = C._calloc(SZ_GEOPOLYGON);
    // Byte positions within the struct
    var geofenceOffset = 0;
    var numHolesOffset = geofenceOffset + SZ_GEOFENCE;
    var holesOffset = numHolesOffset + SZ_INT;
    // geofence is first part of struct
    polygonArrayToGeofence(coordinates[0], geoPolygon + geofenceOffset, isGeoJson);
    var holes;
    if (numHoles > 0) {
        holes = C._calloc(numHoles, SZ_GEOFENCE);
        for (var i = 0; i < numHoles; i++) {
            polygonArrayToGeofence(coordinates[i + 1], holes + SZ_GEOFENCE * i, isGeoJson);
        }
    }
    C.setValue(geoPolygon + numHolesOffset, numHoles, 'i32');
    C.setValue(geoPolygon + holesOffset, holes, 'i32');
    return geoPolygon;
}

/**
 * Free memory allocated for a GeoPolygon struct. It is an error to access the struct
 * after passing it to this method.
 * @return {Number} geoPolygon C pointer to populated GeoPolygon struct
 */
function destroyGeoPolygon(geoPolygon) {
    // Byte positions within the struct
    var geofenceOffset = 0;
    var numHolesOffset = geofenceOffset + SZ_GEOFENCE;
    var holesOffset = numHolesOffset + SZ_INT;
    // Free the outer loop
    C._free(C.getValue(geoPolygon + geofenceOffset, 'i8*'));
    // Free the holes, if any
    var numHoles = C.getValue(geoPolygon + numHolesOffset, 'i32');
    for (var i = 0; i < numHoles; i++) {
        C._free(C.getValue(geoPolygon + holesOffset + SZ_GEOFENCE * i, 'i8*'));
    }
    C._free(geoPolygon);
}

/**
 * Read a long value, returning the lower and upper portions as separate 32-bit integers.
 * Because the upper bits are returned via side effect, the argument to this function is
 * intended to be the invocation that caused the side effect, e.g. readLong(H3.getSomeLong())
 * @param  {Number} invocation Invoked function returning a long value. The actual return
 *                             value of these functions is a 32-bit integer.
 * @return {Number}            Long value as a [lower, upper] pair
 */
function readLong(invocation) {
    // Upper 32-bits of the long set via side-effect
    var upper = C.getTempRet0();
    return [invocation, upper];
}

/**
 * Read an H3 address from a C return value. As with readLong, the argument to this function
 * is intended to be an invocation, e.g. readH3Address(H3.getSomeAddress()), to help ensure that
 * the temp value storing the upper bits of the long is still set.
 * @param  {Number} invocation Invoked function returning a single H3 address
 * @return {String}            H3 address, or null if address was invalid
 */
function readH3Address(invocation) {
    var ref = readLong(invocation);
    var lower = ref[0];
    var upper = ref[1];
    // The lower bits are allowed to be 0s, but if the upper bits are 0 this represents
    // an invalid H3 address
    return upper ? splitLongToH3Address(lower, upper) : null;
}

/**
 * Read an array of 64-bit H3 addresses from C and convert to a JS array of
 * H3 address strings
 * @param  {Number} cAddress    Pointer to C ouput array
 * @param  {Number} maxCount    Max number of hexagons in array. Hexagons with
 *                              the value 0 will be skipped, so this isn't
 *                              necessarily the length of the output array.
 * @return {String[]}           Array of H3 addresses
 */
function readArrayOfHexagons(cAddress, maxCount) {
    var out = [];
    for (var i = 0; i < maxCount * 2; i += 2) {
        var lower = C.getValue(cAddress + SZ_INT * i, 'i32');
        var upper = C.getValue(cAddress + SZ_INT * (i + 1), 'i32');
        if (lower !== 0 || upper !== 0) {
            out.push(splitLongToH3Address(lower, upper));
        }
    }
    return out;
}

/**
 * Store an array of H3 address strings as a C array of 64-bit integers.
 * @param  {Number} cAddress    Pointer to C input array
 * @param  {String[]} hexagons  H3 addresses to pass to the C lib
 */
function storeArrayOfHexagons(cAddress, hexagons) {
    // Assuming the cAddress points to an already appropriately
    // allocated space
    var count = hexagons.length;
    for (var i = 0; i < count; i++) {
        // HEAPU32 is a typed array projection on the address space
        // as unsigned 32-bit integers. This means the address needs
        // to be divided by 4 to access correctly. Also, the hexagon
        // address is 64-bits, so we skip by twos as we're writing
        // to 32-bit integers in the proper order.
        C.HEAPU32.set(h3AddressToSplitLong(hexagons[i]), cAddress / SZ_INT + 2 * i);
    }
}

function readSingleCoord(cAddress) {
    return radsToDegs(C.getValue(cAddress, 'double'));
}

/**
 * Read a GeoCoord from C and return a [lat, lng] pair.
 * @param  {Number} cAddress    Pointer to C struct
 * @return {Number[]}           [lat, lng] pair
 */
function readGeoCoord(cAddress) {
    return [
        constrainLat(readSingleCoord(cAddress)),
        constrainLng(readSingleCoord(cAddress + SZ_DBL))
    ];
}

/**
 * Read a GeoCoord from C and return a GeoJSON-style [lng, lat] pair.
 * @param  {Number} cAddress    Pointer to C struct
 * @return {Number[]}           [lng, lat] pair
 */
function readGeoCoordGeoJson(cAddress) {
    return [
        constrainLng(readSingleCoord(cAddress + SZ_DBL)),
        constrainLat(readSingleCoord(cAddress))
    ];
}

/**
 * Read the GeoBoundary structure into a list of geo coordinate pairs
 * @param {Number}  geoBoundary     C pointer to GeoBoundary struct
 * @param {Boolean} geoJsonCoords   Whether to provide GeoJSON coordinate order: [lng, lat]
 * @param {Boolean} closedLoop      Whether to close the loop
 * @return {Array[]}                Array of geo coordinate pairs
 */
function readGeoBoundary(geoBoundary, geoJsonCoords, closedLoop) {
    var numVerts = C.getValue(geoBoundary, 'i32');
    // Note that though numVerts is an int, the coordinate doubles have to be
    // aligned to 8 bytes, hence the 8-byte offset here
    var vertsPos = geoBoundary + SZ_DBL;
    var out = [];
    // Support [lng, lat] pairs if GeoJSON is specified
    var readCoord = geoJsonCoords ? readGeoCoordGeoJson : readGeoCoord;
    for (var i = 0; i < numVerts * 2; i += 2) {
        out.push(readCoord(vertsPos + SZ_DBL * i));
    }
    if (closedLoop) {
        // Close loop if GeoJSON is specified
        out.push(out[0]);
    }
    return out;
}

/**
 * Read the LinkedGeoPolygon structure into a nested array of MultiPolygon coordinates
 * @param {Number}  polygon         C pointer to LinkedGeoPolygon struct
 * @param {Boolean} formatAsGeoJson Whether to provide GeoJSON output: [lng, lat], closed loops
 * @return {Array[]}                MultiPolygon-style output.
 */
function readMultiPolygon(polygon, formatAsGeoJson) {
    var output = [];
    var readCoord = formatAsGeoJson ? readGeoCoordGeoJson : readGeoCoord;
    var loops;
    var loop;
    var coords;
    var coord;
    // Loop through the linked structure, building the output
    while (polygon) {
        output.push((loops = []));
        // Follow ->first pointer
        loop = C.getValue(polygon, 'i8*');
        while (loop) {
            loops.push((coords = []));
            // Follow ->first pointer
            coord = C.getValue(loop, 'i8*');
            while (coord) {
                coords.push(readCoord(coord));
                // Follow ->next pointer
                coord = C.getValue(coord + SZ_DBL * 2, 'i8*');
            }
            if (formatAsGeoJson) {
                // Close loop if GeoJSON is requested
                coords.push(coords[0]);
            }
            // Follow ->next pointer
            loop = C.getValue(loop + SZ_PTR * 2, 'i8*');
        }
        // Follow ->next pointer
        polygon = C.getValue(polygon + SZ_PTR * 2, 'i8*');
    }
    return output;
}

// ----------------------------------------------------------------------------
// Public API functions: Core

/**
 * Whether a given string represents a valid H3 address
 * @param  {String} h3Address H3 address to check
 * @return {Boolean}          Whether the address is valid
 */
function h3IsValid(h3Address) {
    var ref = h3AddressToSplitLong(h3Address);
    var lower = ref[0];
    var upper = ref[1];
    return Boolean(H3.h3IsValid(lower, upper));
}

/**
 * Whether the given H3 address is a pentagon
 * @param  {String} h3Address H3 address to check
 * @return {Boolean}          isPentagon
 */
function h3IsPentagon(h3Address) {
    var ref = h3AddressToSplitLong(h3Address);
    var lower = ref[0];
    var upper = ref[1];
    return Boolean(H3.h3IsPentagon(lower, upper));
}

/**
 * Whether the given H3 address is in a Class III resolution (rotated versus
 * the icosahedron and subject to shape distortion adding extra points on
 * icosahedron edges, making them not true hexagons).
 * @param  {String} h3Address H3 address to check
 * @return {Boolean}          isResClassIII
 */
function h3IsResClassIII(h3Address) {
    var ref = h3AddressToSplitLong(h3Address);
    var lower = ref[0];
    var upper = ref[1];
    return Boolean(H3.h3IsResClassIII(lower, upper));
}

/**
 * Get the number of the base cell for a given H3 index
 * @param  {String} h3Address H3 address to get the base cell for
 * @return {Number}           Index of the base cell (0-121)
 */
function h3GetBaseCell(h3Address) {
    var ref = h3AddressToSplitLong(h3Address);
    var lower = ref[0];
    var upper = ref[1];
    return H3.h3GetBaseCell(lower, upper);
}

/**
 * Returns the resolution of an H3 address
 * @param  {String} h3Address H3 address to get resolution
 * @return {Integer}          The number (0-15) resolution, or -1 if invalid
 */
function h3GetResolution(h3Address) {
    if (typeof h3Address !== 'string') {
        return -1;
    }
    return parseInt(h3Address.charAt(1), BASE_16);
}

/**
 * Get the hexagon containing a lat,lon point
 * @param  {Number} lat Latitude of point
 * @param  {Number} lng Longtitude of point
 * @param  {Number} res Resolution of hexagons to return
 * @return {String}     H3 address
 */
function geoToH3(lat, lng, res) {
    lat = constrainLat(lat);
    lng = constrainLng(lng);
    var latlng = C._malloc(SZ_GEOCOORD);
    // Slightly more efficient way to set the memory
    C.HEAPF64.set([lat, lng].map(degsToRads), latlng / SZ_DBL);
    // Read value as a split long
    var h3Address = readH3Address(H3.geoToH3(latlng, res));
    C._free(latlng);
    return h3Address;
}

/**
 * Get the lat,lon center of a given hexagon
 * @param  {String} h3Address H3 address
 * @return {Number[]}         Point as a [lat, lng] pair
 */
function h3ToGeo(h3Address) {
    var latlng = C._malloc(SZ_GEOCOORD);
    var ref = h3AddressToSplitLong(h3Address);
    var lower = ref[0];
    var upper = ref[1];
    H3.h3ToGeo(lower, upper, latlng);
    var out = readGeoCoord(latlng);
    C._free(latlng);
    return out;
}

/**
 * Get the vertices of a given hexagon (or pentagon), as an array of [lat, lng]
 * points. For pentagons and hexagons on the edge of an icosahedron face, this
 * function may return up to 10 vertices.
 * @param  {String} h3Address       H3 address
 * @param {Boolean} formatAsGeoJson Whether to provide GeoJSON output: [lng, lat], closed loops
 * @return {Array[]}                Array of [lat, lng] pairs
 */
function h3ToGeoBoundary(h3Address, formatAsGeoJson) {
    var geoBoundary = C._malloc(SZ_GEOBOUNDARY);
    var ref = h3AddressToSplitLong(h3Address);
    var lower = ref[0];
    var upper = ref[1];
    H3.h3ToGeoBoundary(lower, upper, geoBoundary);
    var out = readGeoBoundary(geoBoundary, formatAsGeoJson, formatAsGeoJson);
    C._free(geoBoundary);
    return out;
}

// ----------------------------------------------------------------------------
// Public API functions: Algorithms

/**
 * Get the parent of the given hexagon at a particular resolution
 * @param  {String} h3Address H3 address to get parent for
 * @param  {Number} res       Resolution of hexagon to return
 * @return {String}           H3 address of parent, or null for invalid input
 */
function h3ToParent(h3Address, res) {
    var ref = h3AddressToSplitLong(h3Address);
    var lower = ref[0];
    var upper = ref[1];
    return readH3Address(H3.h3ToParent(lower, upper, res));
}

/**
 * Get the children/descendents of the given hexagon at a particular resolution
 * @param  {String} h3Address H3 address to get children for
 * @param  {Number} res       Resolution of hexagons to return
 * @return {String[]}         H3 addresses of children, or empty array for invalid input
 */
function h3ToChildren(h3Address, res) {
    var ref = h3AddressToSplitLong(h3Address);
    var lower = ref[0];
    var upper = ref[1];
    var maxCount = H3.maxH3ToChildrenSize(lower, upper, res);
    var hexagons = C._calloc(maxCount, SZ_H3INDEX);
    H3.h3ToChildren(lower, upper, res, hexagons);
    var out = readArrayOfHexagons(hexagons, maxCount);
    C._free(hexagons);
    return out;
}

/**
 * Get all hexagons in a k-ring around a given center. The order of the hexagons is undefined.
 * @param  {String} h3Address H3 address of center hexagon
 * @param  {String} ringSize  Radius of k-ring
 * @return {String[]}         H3 addresses for all hexagons in ring
 */
function kRing(h3Address, ringSize) {
    var ref = h3AddressToSplitLong(h3Address);
    var lower = ref[0];
    var upper = ref[1];
    var maxCount = H3.maxKringSize(ringSize);
    var hexagons = C._calloc(maxCount, SZ_H3INDEX);
    H3.kRing(lower, upper, ringSize, hexagons);
    var out = readArrayOfHexagons(hexagons, maxCount);
    C._free(hexagons);
    return out;
}

/**
 * Get all hexagons in a k-ring around a given center, in an array of arrays
 * ordered by distance from the origin. The order of the hexagons within each ring is undefined.
 *
 * @param  {String} h3Address H3 address of center hexagon
 * @param  {String} ringSize  Radius of k-ring
 * @return {String[][]}       Array of arrays with H3 addresses for all hexagons each ring
 */
function kRingDistances(h3Address, ringSize) {
    var ref = h3AddressToSplitLong(h3Address);
    var lower = ref[0];
    var upper = ref[1];
    var maxCount = H3.maxKringSize(ringSize);
    var kRings = C._calloc(maxCount, SZ_H3INDEX);
    var distances = C._calloc(maxCount, SZ_INT);
    H3.kRingDistances(lower, upper, ringSize, kRings, distances);
    // Create an array of empty arrays to hold the output
    var out = [];
    for (var i = 0; i < ringSize + 1; i++) {
        out.push([]);
    }
    // Read the array of hexagons, putting them into the appropriate rings
    for (var i$1 = 0; i$1 < maxCount * 2; i$1 += 2) {
        var hexLower = C.getValue(kRings + SZ_INT * i$1, 'i32');
        var hexUpper = C.getValue(kRings + SZ_INT * (i$1 + 1), 'i32');
        var index = C.getValue(distances + SZ_INT * (i$1 / 2), 'i32');
        if (hexLower !== 0 || hexUpper !== 0) {
            out[index].push(splitLongToH3Address(hexLower, hexUpper));
        }
    }
    C._free(kRings);
    C._free(distances);
    return out;
}

/**
 * Get all hexagons in a hollow hexagonal ring centered at origin with sides of a given length.
 * Unlike kRing, this function will throw an error if there is a pentagon anywhere in the ring.
 * @param  {String} h3Address H3 address of center hexagon
 * @param  {String} ringSize  Radius of ring
 * @return {String[]}         H3 addresses for all hexagons in ring
 */
function hexRing(h3Address, ringSize) {
    var maxCount = ringSize === 0 ? 1 : 6 * ringSize;
    var hexagons = C._calloc(maxCount, SZ_H3INDEX);
    var retVal = H3.hexRing.apply(H3, h3AddressToSplitLong(h3Address).concat( [ringSize], [hexagons] ));
    if (retVal !== 0) {
        C._free(hexagons);
        throw new Error('Failed to get hexRing (encountered a pentagon?)');
    }
    var out = readArrayOfHexagons(hexagons, maxCount);
    C._free(hexagons);
    return out;
}

/**
 * Get all hexagons with centers contained in a given polygon. The polygon
 * is specified with GeoJson semantics as an array of loops. Each loop is
 * an array of [lat, lng] pairs (or [lng, lat] if isGeoJson is specified).
 * The first loop is the perimeter of the polygon, and subsequent loops are
 * expected to be holes.
 * @param  {Array[]}  coordinates   Array of loops, or a single loop
 * @param  {Number} res             Resolution of hexagons to return
 * @param  {Boolean} isGeoJson      Whether to expect GeoJson-style [lng, lat]
 *                                  pairs instead of [lat, lng]
 * @return {String[]}               H3 addresses for all hexagons in polygon
 */
function polyfill(coordinates, res, isGeoJson) {
    validateRes(res);
    isGeoJson = Boolean(isGeoJson);
    // Guard against empty input
    if (coordinates.length === 0 || coordinates[0].length === 0) {
        return [];
    }
    // Wrap to expected format if a single loop is provided
    if (typeof coordinates[0][0] === 'number') {
        coordinates = [coordinates];
    }
    var geoPolygon = coordinatesToGeoPolygon(coordinates, isGeoJson);
    var arrayLen = H3.maxPolyfillSize(geoPolygon, res);
    var hexagons = C._calloc(arrayLen, SZ_H3INDEX);
    H3.polyfill(geoPolygon, res, hexagons);
    var out = readArrayOfHexagons(hexagons, arrayLen);
    C._free(hexagons);
    destroyGeoPolygon(geoPolygon);
    return out;
}

/**
 * Get the outlines of a set of H3 hexagons, returned in GeoJSON MultiPolygon
 * format (an array of polygons, each with an array of loops, each an array of
 * coordinates). Coordinates are returned as [lat, lng] pairs unless GeoJSON
 * is requested.
 * @param {String[]} h3Addresses H3 addresses to get outlines for
 * @param {Boolean}  formatAsGeoJson Whether to provide GeoJSON output: [lng, lat], closed loops
 * @return {Array[]}        MultiPolygon-style output.
 */
function h3SetToMultiPolygon(h3Addresses, formatAsGeoJson) {
    // Early exit on empty input
    if (!h3Addresses || !h3Addresses.length) {
        return [];
    }
    // Set up input set
    var addressCount = h3Addresses.length;
    var set = C._calloc(addressCount, SZ_H3INDEX);
    storeArrayOfHexagons(set, h3Addresses);
    // Allocate memory for output linked polygon
    var polygon = C._calloc(SZ_LINKED_GEOPOLYGON);
    // Store a reference to the first polygon - that's the one we need for
    // memory deallocation
    var originalPolygon = polygon;
    H3.h3SetToLinkedGeo(set, addressCount, polygon);
    var multiPolygon = readMultiPolygon(polygon, formatAsGeoJson);
    // Clean up
    H3.destroyLinkedPolygon(originalPolygon);
    C._free(originalPolygon);
    C._free(set);
    return multiPolygon;
}

/**
 * Compact a set of hexagons of the same resolution into a set of hexagons across
 * multiple levels that represents the same area.
 * @param  {String[]} h3Set H3 addresses to compact
 * @return {$tring[]}       Compacted H3 addresses
 * @throws if there is a malformed input
 */
function compact(h3Set) {
    if (!h3Set || !h3Set.length) {
        return [];
    }
    // Set up input set
    var count = h3Set.length;
    var set = C._calloc(count, SZ_H3INDEX);
    storeArrayOfHexagons(set, h3Set);
    // Allocate memory for compacted hexagons, worst-case is no compaction
    var compactedSet = C._calloc(count, SZ_H3INDEX);
    var retVal = H3.compact(set, compactedSet, count);
    if (retVal !== 0) {
        C._free(set);
        C._free(compactedSet);
        throw new Error('Failed to compact, malformed input data (duplicate hexagons?)');
    }
    var out = readArrayOfHexagons(compactedSet, count);
    C._free(set);
    C._free(compactedSet);
    return out;
}

/**
 * Uncompact a compacted set of hexagons to hexagons of the same resolution
 * @param  {String[]} compactedSet H3 addresses to uncompact
 * @param  {Number}   res          The resolution to uncompact to
 * @return {String[]}              The uncompacted H3 addresses
 * @throws if there is malformed input
 */
function uncompact(compactedSet, res) {
    validateRes(res);
    if (!compactedSet || !compactedSet.length) {
        return [];
    }
    // Set up input set
    var count = compactedSet.length;
    var set = C._calloc(count, SZ_H3INDEX);
    storeArrayOfHexagons(set, compactedSet);
    // Estimate how many hexagons we need (always overestimates if in error)
    var maxUncompactedNum = H3.maxUncompactSize(set, count, res);
    // Allocate memory for uncompacted hexagons
    var uncompactedSet = C._calloc(maxUncompactedNum, SZ_H3INDEX);
    var retVal = H3.uncompact(set, count, uncompactedSet, maxUncompactedNum, res);
    if (retVal !== 0) {
        C._free(set);
        C._free(uncompactedSet);
        throw new Error('Failed to uncompact (bad resolution?)');
    }
    var out = readArrayOfHexagons(uncompactedSet, maxUncompactedNum);
    C._free(set);
    C._free(uncompactedSet);
    return out;
}

// ----------------------------------------------------------------------------
// Public API functions: Unidirectional edges

/**
 * Whether two H3 addresses are neighbors (share an edge)
 * @param  {String} origin      Origin hexagon address
 * @param  {String} destination Destination hexagon address
 * @return {Boolean}           Whether the hexagons share an edge
 */
function h3IndexesAreNeighbors(origin, destination) {
    var ref = h3AddressToSplitLong(origin);
    var oLower = ref[0];
    var oUpper = ref[1];
    var ref$1 = h3AddressToSplitLong(destination);
    var dLower = ref$1[0];
    var dUpper = ref$1[1];
    return Boolean(H3.h3IndexesAreNeighbors(oLower, oUpper, dLower, dUpper));
}

/**
 * Get an H3 index representing a unidirectional edge for a given origin and destination
 * @param  {String} origin      Origin hexagon address
 * @param  {String} destination Destination hexagon address
 * @return {String}             H3 address of the edge, or null if no edge is shared
 */
function getH3UnidirectionalEdge(origin, destination) {
    var ref = h3AddressToSplitLong(origin);
    var oLower = ref[0];
    var oUpper = ref[1];
    var ref$1 = h3AddressToSplitLong(destination);
    var dLower = ref$1[0];
    var dUpper = ref$1[1];
    return readH3Address(H3.getH3UnidirectionalEdge(oLower, oUpper, dLower, dUpper));
}

/**
 * Get the origin hexagon from an H3 address representing a unidirectional edge
 * @param  {String} edgeAddress H3 address of the edge
 * @return {String}             H3 address of the edge origin
 */
function getOriginH3IndexFromUnidirectionalEdge(edgeAddress) {
    var ref = h3AddressToSplitLong(edgeAddress);
    var lower = ref[0];
    var upper = ref[1];
    return readH3Address(H3.getOriginH3IndexFromUnidirectionalEdge(lower, upper));
}

/**
 * Get the destination hexagon from an H3 address representing a unidirectional edge
 * @param  {String} edgeAddress H3 address of the edge
 * @return {String}             H3 address of the edge destination
 */
function getDestinationH3IndexFromUnidirectionalEdge(edgeAddress) {
    var ref = h3AddressToSplitLong(edgeAddress);
    var lower = ref[0];
    var upper = ref[1];
    return readH3Address(H3.getDestinationH3IndexFromUnidirectionalEdge(lower, upper));
}

/**
 * Whether the input is a valid unidirectional edge
 * @param  {String} edgeAddress H3 address of the edge
 * @return {Boolean}            Whether the address is valid
 */
function h3UnidirectionalEdgeIsValid(edgeAddress) {
    var ref = h3AddressToSplitLong(edgeAddress);
    var lower = ref[0];
    var upper = ref[1];
    return Boolean(H3.h3UnidirectionalEdgeIsValid(lower, upper));
}

/**
 * Get the [origin, destination] pair represented by a unidirectional edge
 * @param  {String} edgeAddress H3 address of the edge
 * @return {String[]}           [origin, destination] pair as H3 addresses
 */
function getH3IndexesFromUnidirectionalEdge(edgeAddress) {
    var ref = h3AddressToSplitLong(edgeAddress);
    var lower = ref[0];
    var upper = ref[1];
    var count = 2;
    var hexagons = C._calloc(count, SZ_H3INDEX);
    H3.getH3IndexesFromUnidirectionalEdge(lower, upper, hexagons);
    var out = readArrayOfHexagons(hexagons, count);
    C._free(hexagons);
    return out;
}

/**
 * Get all of the unidirectional edges with the given H3 index as the origin (i.e. an edge to
 * every neighbor)
 * @param  {String} h3Address   H3 address of the origin hexagon
 * @return {String[]}           List of unidirectional edges
 */
function getH3UnidirectionalEdgesFromHexagon(h3Address) {
    var ref = h3AddressToSplitLong(h3Address);
    var lower = ref[0];
    var upper = ref[1];
    var count = 6;
    var edges = C._calloc(count, SZ_H3INDEX);
    H3.getH3UnidirectionalEdgesFromHexagon(lower, upper, edges);
    var out = readArrayOfHexagons(edges, count);
    C._free(edges);
    return out;
}

/**
 * Get the vertices of a given edge as an array of [lat, lng] points. Note that for edges that
 * cross the edge of an icosahedron face, this may return 3 coordinates.
 * @param  {String} edgeAddress     H3 address of the edge
 * @param {Boolean} formatAsGeoJson Whether to provide GeoJSON output: [lng, lat]
 * @return {Array[]}                Array of geo coordinate pairs
 */
function getH3UnidirectionalEdgeBoundary(edgeAddress, formatAsGeoJson) {
    var geoBoundary = C._malloc(SZ_GEOBOUNDARY);
    var ref = h3AddressToSplitLong(edgeAddress);
    var lower = ref[0];
    var upper = ref[1];
    H3.getH3UnidirectionalEdgeBoundary(lower, upper, geoBoundary);
    var out = readGeoBoundary(geoBoundary, formatAsGeoJson);
    C._free(geoBoundary);
    return out;
}

// ----------------------------------------------------------------------------
// Public informational utilities

/**
 * Average hexagon area at a given resolution
 * @param  {Number} res  Hexagon resolution
 * @param  {String} unit Area unit (either UNITS.m2 or UNITS.km2)
 * @return {Number}      Average area
 */
function hexArea(res, unit) {
    validateRes(res);
    switch (unit) {
        case UNITS.m2:
            return H3.hexAreaM2(res);
        case UNITS.km2:
            return H3.hexAreaKm2(res);
        default:
            throw new Error(("Unknown unit: " + unit));
    }
}

/**
 * Average hexagon edge length at a given resolution
 * @param  {Number} res  Hexagon resolution
 * @param  {String} unit Area unit (either UNITS.m or UNITS.km)
 * @return {Number}      Average edge length
 */
function edgeLength(res, unit) {
    validateRes(res);
    switch (unit) {
        case UNITS.m:
            return H3.edgeLengthM(res);
        case UNITS.km:
            return H3.edgeLengthKm(res);
        default:
            throw new Error(("Unknown unit: " + unit));
    }
}

/**
 * The total count of hexagons in the world at a given resolution. Note that above
 * resolution 8 the exact count cannot be represented in a JavaScript 32-bit number,
 * so consumers should use caution when applying further operations to the output.
 * @param  {Number} res  Hexagon resolution
 * @return {Number}      Count
 */
function numHexagons(res) {
    validateRes(res);
    // Get number as a long value
    var ref = readLong(H3.numHexagons(res));
    var lower = ref[0];
    var upper = ref[1];
    // If we're using <= 32 bits we can use normal JS numbers
    if (!upper) {
        return lower;
    }
    // Above 32 bit, make a JS number that's correct in order of magnitude
    return upper * Math.pow(2, 32) + lower;
}

// ----------------------------------------------------------------------------
// Export

module.exports = {
    h3IsValid: h3IsValid,
    h3IsPentagon: h3IsPentagon,
    h3IsResClassIII: h3IsResClassIII,
    h3GetBaseCell: h3GetBaseCell,
    h3GetResolution: h3GetResolution,
    geoToH3: geoToH3,
    h3ToGeo: h3ToGeo,
    h3ToGeoBoundary: h3ToGeoBoundary,
    h3ToParent: h3ToParent,
    h3ToChildren: h3ToChildren,
    kRing: kRing,
    kRingDistances: kRingDistances,
    hexRing: hexRing,
    polyfill: polyfill,
    h3SetToMultiPolygon: h3SetToMultiPolygon,
    compact: compact,
    uncompact: uncompact,
    h3IndexesAreNeighbors: h3IndexesAreNeighbors,
    getH3UnidirectionalEdge: getH3UnidirectionalEdge,
    getOriginH3IndexFromUnidirectionalEdge: getOriginH3IndexFromUnidirectionalEdge,
    getDestinationH3IndexFromUnidirectionalEdge: getDestinationH3IndexFromUnidirectionalEdge,
    h3UnidirectionalEdgeIsValid: h3UnidirectionalEdgeIsValid,
    getH3IndexesFromUnidirectionalEdge: getH3IndexesFromUnidirectionalEdge,
    getH3UnidirectionalEdgesFromHexagon: getH3UnidirectionalEdgesFromHexagon,
    getH3UnidirectionalEdgeBoundary: getH3UnidirectionalEdgeBoundary,
    hexArea: hexArea,
    edgeLength: edgeLength,
    numHexagons: numHexagons,
    degsToRads: degsToRads,
    radsToDegs: radsToDegs,
    UNITS: UNITS
};

},{"../out/libh3.1":9,"./bindings":7}],9:[function(require,module,exports){
(function (process,Buffer){
var libh3 = function(libh3) {
  libh3 = libh3 || {};

var Module=typeof libh3!=="undefined"?libh3:{};var moduleOverrides={};var key;for(key in Module){if(Module.hasOwnProperty(key)){moduleOverrides[key]=Module[key]}}Module["arguments"]=[];Module["thisProgram"]="./this.program";Module["quit"]=(function(status,toThrow){throw toThrow});Module["preRun"]=[];Module["postRun"]=[];var ENVIRONMENT_IS_WEB=false;var ENVIRONMENT_IS_WORKER=false;var ENVIRONMENT_IS_NODE=false;var ENVIRONMENT_IS_SHELL=false;if(Module["ENVIRONMENT"]){if(Module["ENVIRONMENT"]==="WEB"){ENVIRONMENT_IS_WEB=true}else if(Module["ENVIRONMENT"]==="WORKER"){ENVIRONMENT_IS_WORKER=true}else if(Module["ENVIRONMENT"]==="NODE"){ENVIRONMENT_IS_NODE=true}else if(Module["ENVIRONMENT"]==="SHELL"){ENVIRONMENT_IS_SHELL=true}else{throw new Error("Module['ENVIRONMENT'] value is not valid. must be one of: WEB|WORKER|NODE|SHELL.")}}else{ENVIRONMENT_IS_WEB=typeof window==="object";ENVIRONMENT_IS_WORKER=typeof importScripts==="function";ENVIRONMENT_IS_NODE=typeof process==="object"&&typeof require==="function"&&!ENVIRONMENT_IS_WEB&&!ENVIRONMENT_IS_WORKER;ENVIRONMENT_IS_SHELL=!ENVIRONMENT_IS_WEB&&!ENVIRONMENT_IS_NODE&&!ENVIRONMENT_IS_WORKER}if(ENVIRONMENT_IS_NODE){var nodeFS;var nodePath;Module["read"]=function shell_read(filename,binary){var ret;ret=tryParseAsDataURI(filename);if(!ret){if(!nodeFS)nodeFS=require("fs");if(!nodePath)nodePath=require("path");filename=nodePath["normalize"](filename);ret=nodeFS["readFileSync"](filename)}return binary?ret:ret.toString()};Module["readBinary"]=function readBinary(filename){var ret=Module["read"](filename,true);if(!ret.buffer){ret=new Uint8Array(ret)}assert(ret.buffer);return ret};if(process["argv"].length>1){Module["thisProgram"]=process["argv"][1].replace(/\\/g,"/")}Module["arguments"]=process["argv"].slice(2);process["on"]("uncaughtException",(function(ex){if(!(ex instanceof ExitStatus)){throw ex}}));process["on"]("unhandledRejection",(function(reason,p){process["exit"](1)}));Module["inspect"]=(function(){return"[Emscripten Module object]"})}else if(ENVIRONMENT_IS_SHELL){if(typeof read!="undefined"){Module["read"]=function shell_read(f){var data=tryParseAsDataURI(f);if(data){return intArrayToString(data)}return read(f)}}Module["readBinary"]=function readBinary(f){var data;data=tryParseAsDataURI(f);if(data){return data}if(typeof readbuffer==="function"){return new Uint8Array(readbuffer(f))}data=read(f,"binary");assert(typeof data==="object");return data};if(typeof scriptArgs!="undefined"){Module["arguments"]=scriptArgs}else if(typeof arguments!="undefined"){Module["arguments"]=arguments}if(typeof quit==="function"){Module["quit"]=(function(status,toThrow){quit(status)})}}else if(ENVIRONMENT_IS_WEB||ENVIRONMENT_IS_WORKER){Module["read"]=function shell_read(url){try{var xhr=new XMLHttpRequest;xhr.open("GET",url,false);xhr.send(null);return xhr.responseText}catch(err){var data=tryParseAsDataURI(url);if(data){return intArrayToString(data)}throw err}};if(ENVIRONMENT_IS_WORKER){Module["readBinary"]=function readBinary(url){try{var xhr=new XMLHttpRequest;xhr.open("GET",url,false);xhr.responseType="arraybuffer";xhr.send(null);return new Uint8Array(xhr.response)}catch(err){var data=tryParseAsDataURI(url);if(data){return data}throw err}}}Module["readAsync"]=function readAsync(url,onload,onerror){var xhr=new XMLHttpRequest;xhr.open("GET",url,true);xhr.responseType="arraybuffer";xhr.onload=function xhr_onload(){if(xhr.status==200||xhr.status==0&&xhr.response){onload(xhr.response);return}var data=tryParseAsDataURI(url);if(data){onload(data.buffer);return}onerror()};xhr.onerror=onerror;xhr.send(null)};Module["setWindowTitle"]=(function(title){document.title=title})}Module["print"]=typeof console!=="undefined"?console.log.bind(console):typeof print!=="undefined"?print:null;Module["printErr"]=typeof printErr!=="undefined"?printErr:typeof console!=="undefined"&&console.warn.bind(console)||Module["print"];Module.print=Module["print"];Module.printErr=Module["printErr"];for(key in moduleOverrides){if(moduleOverrides.hasOwnProperty(key)){Module[key]=moduleOverrides[key]}}moduleOverrides=undefined;var STACK_ALIGN=16;function staticAlloc(size){assert(!staticSealed);var ret=STATICTOP;STATICTOP=STATICTOP+size+15&-16;return ret}function dynamicAlloc(size){assert(DYNAMICTOP_PTR);var ret=HEAP32[DYNAMICTOP_PTR>>2];var end=ret+size+15&-16;HEAP32[DYNAMICTOP_PTR>>2]=end;if(end>=TOTAL_MEMORY){var success=enlargeMemory();if(!success){HEAP32[DYNAMICTOP_PTR>>2]=ret;return 0}}return ret}function alignMemory(size,factor){if(!factor)factor=STACK_ALIGN;var ret=size=Math.ceil(size/factor)*factor;return ret}function getNativeTypeSize(type){switch(type){case"i1":case"i8":return 1;case"i16":return 2;case"i32":return 4;case"i64":return 8;case"float":return 4;case"double":return 8;default:{if(type[type.length-1]==="*"){return 4}else if(type[0]==="i"){var bits=parseInt(type.substr(1));assert(bits%8===0);return bits/8}else{return 0}}}}function warnOnce(text){if(!warnOnce.shown)warnOnce.shown={};if(!warnOnce.shown[text]){warnOnce.shown[text]=1;Module.printErr(text)}}var jsCallStartIndex=1;var functionPointers=new Array(0);var funcWrappers={};function dynCall(sig,ptr,args){if(args&&args.length){return Module["dynCall_"+sig].apply(null,[ptr].concat(args))}else{return Module["dynCall_"+sig].call(null,ptr)}}var GLOBAL_BASE=8;var ABORT=0;var EXITSTATUS=0;function assert(condition,text){if(!condition){abort("Assertion failed: "+text)}}function getCFunc(ident){var func=Module["_"+ident];assert(func,"Cannot call unknown function "+ident+", make sure it is exported");return func}var JSfuncs={"stackSave":(function(){stackSave()}),"stackRestore":(function(){stackRestore()}),"arrayToC":(function(arr){var ret=stackAlloc(arr.length);writeArrayToMemory(arr,ret);return ret}),"stringToC":(function(str){var ret=0;if(str!==null&&str!==undefined&&str!==0){var len=(str.length<<2)+1;ret=stackAlloc(len);stringToUTF8(str,ret,len)}return ret})};var toC={"string":JSfuncs["stringToC"],"array":JSfuncs["arrayToC"]};function ccall(ident,returnType,argTypes,args,opts){var func=getCFunc(ident);var cArgs=[];var stack=0;if(args){for(var i=0;i<args.length;i++){var converter=toC[argTypes[i]];if(converter){if(stack===0)stack=stackSave();cArgs[i]=converter(args[i])}else{cArgs[i]=args[i]}}}var ret=func.apply(null,cArgs);if(returnType==="string")ret=Pointer_stringify(ret);else if(returnType==="boolean")ret=Boolean(ret);if(stack!==0){stackRestore(stack)}return ret}function cwrap(ident,returnType,argTypes){argTypes=argTypes||[];var cfunc=getCFunc(ident);var numericArgs=argTypes.every((function(type){return type==="number"}));var numericRet=returnType!=="string";if(numericRet&&numericArgs){return cfunc}return(function(){return ccall(ident,returnType,argTypes,arguments)})}function setValue(ptr,value,type,noSafe){type=type||"i8";if(type.charAt(type.length-1)==="*")type="i32";switch(type){case"i1":HEAP8[ptr>>0]=value;break;case"i8":HEAP8[ptr>>0]=value;break;case"i16":HEAP16[ptr>>1]=value;break;case"i32":HEAP32[ptr>>2]=value;break;case"i64":tempI64=[value>>>0,(tempDouble=value,+Math_abs(tempDouble)>=+1?tempDouble>+0?(Math_min(+Math_floor(tempDouble/+4294967296),+4294967295)|0)>>>0:~~+Math_ceil((tempDouble- +(~~tempDouble>>>0))/+4294967296)>>>0:0)],HEAP32[ptr>>2]=tempI64[0],HEAP32[ptr+4>>2]=tempI64[1];break;case"float":HEAPF32[ptr>>2]=value;break;case"double":HEAPF64[ptr>>3]=value;break;default:abort("invalid type for setValue: "+type)}}function getValue(ptr,type,noSafe){type=type||"i8";if(type.charAt(type.length-1)==="*")type="i32";switch(type){case"i1":return HEAP8[ptr>>0];case"i8":return HEAP8[ptr>>0];case"i16":return HEAP16[ptr>>1];case"i32":return HEAP32[ptr>>2];case"i64":return HEAP32[ptr>>2];case"float":return HEAPF32[ptr>>2];case"double":return HEAPF64[ptr>>3];default:abort("invalid type for getValue: "+type)}return null}var ALLOC_STATIC=2;var ALLOC_NONE=4;function allocate(slab,types,allocator,ptr){var zeroinit,size;if(typeof slab==="number"){zeroinit=true;size=slab}else{zeroinit=false;size=slab.length}var singleType=typeof types==="string"?types:null;var ret;if(allocator==ALLOC_NONE){ret=ptr}else{ret=[typeof _malloc==="function"?_malloc:staticAlloc,stackAlloc,staticAlloc,dynamicAlloc][allocator===undefined?ALLOC_STATIC:allocator](Math.max(size,singleType?1:types.length))}if(zeroinit){var stop;ptr=ret;assert((ret&3)==0);stop=ret+(size&~3);for(;ptr<stop;ptr+=4){HEAP32[ptr>>2]=0}stop=ret+size;while(ptr<stop){HEAP8[ptr++>>0]=0}return ret}if(singleType==="i8"){if(slab.subarray||slab.slice){HEAPU8.set(slab,ret)}else{HEAPU8.set(new Uint8Array(slab),ret)}return ret}var i=0,type,typeSize,previousType;while(i<size){var curr=slab[i];type=singleType||types[i];if(type===0){i++;continue}if(type=="i64")type="i32";setValue(ret+i,curr,type);if(previousType!==type){typeSize=getNativeTypeSize(type);previousType=type}i+=typeSize}return ret}function Pointer_stringify(ptr,length){if(length===0||!ptr)return"";var hasUtf=0;var t;var i=0;while(1){t=HEAPU8[ptr+i>>0];hasUtf|=t;if(t==0&&!length)break;i++;if(length&&i==length)break}if(!length)length=i;var ret="";if(hasUtf<128){var MAX_CHUNK=1024;var curr;while(length>0){curr=String.fromCharCode.apply(String,HEAPU8.subarray(ptr,ptr+Math.min(length,MAX_CHUNK)));ret=ret?ret+curr:curr;ptr+=MAX_CHUNK;length-=MAX_CHUNK}return ret}return UTF8ToString(ptr)}var UTF8Decoder=typeof TextDecoder!=="undefined"?new TextDecoder("utf8"):undefined;function UTF8ArrayToString(u8Array,idx){var endPtr=idx;while(u8Array[endPtr])++endPtr;if(endPtr-idx>16&&u8Array.subarray&&UTF8Decoder){return UTF8Decoder.decode(u8Array.subarray(idx,endPtr))}else{var u0,u1,u2,u3,u4,u5;var str="";while(1){u0=u8Array[idx++];if(!u0)return str;if(!(u0&128)){str+=String.fromCharCode(u0);continue}u1=u8Array[idx++]&63;if((u0&224)==192){str+=String.fromCharCode((u0&31)<<6|u1);continue}u2=u8Array[idx++]&63;if((u0&240)==224){u0=(u0&15)<<12|u1<<6|u2}else{u3=u8Array[idx++]&63;if((u0&248)==240){u0=(u0&7)<<18|u1<<12|u2<<6|u3}else{u4=u8Array[idx++]&63;if((u0&252)==248){u0=(u0&3)<<24|u1<<18|u2<<12|u3<<6|u4}else{u5=u8Array[idx++]&63;u0=(u0&1)<<30|u1<<24|u2<<18|u3<<12|u4<<6|u5}}}if(u0<65536){str+=String.fromCharCode(u0)}else{var ch=u0-65536;str+=String.fromCharCode(55296|ch>>10,56320|ch&1023)}}}}function UTF8ToString(ptr){return UTF8ArrayToString(HEAPU8,ptr)}function stringToUTF8Array(str,outU8Array,outIdx,maxBytesToWrite){if(!(maxBytesToWrite>0))return 0;var startIdx=outIdx;var endIdx=outIdx+maxBytesToWrite-1;for(var i=0;i<str.length;++i){var u=str.charCodeAt(i);if(u>=55296&&u<=57343)u=65536+((u&1023)<<10)|str.charCodeAt(++i)&1023;if(u<=127){if(outIdx>=endIdx)break;outU8Array[outIdx++]=u}else if(u<=2047){if(outIdx+1>=endIdx)break;outU8Array[outIdx++]=192|u>>6;outU8Array[outIdx++]=128|u&63}else if(u<=65535){if(outIdx+2>=endIdx)break;outU8Array[outIdx++]=224|u>>12;outU8Array[outIdx++]=128|u>>6&63;outU8Array[outIdx++]=128|u&63}else if(u<=2097151){if(outIdx+3>=endIdx)break;outU8Array[outIdx++]=240|u>>18;outU8Array[outIdx++]=128|u>>12&63;outU8Array[outIdx++]=128|u>>6&63;outU8Array[outIdx++]=128|u&63}else if(u<=67108863){if(outIdx+4>=endIdx)break;outU8Array[outIdx++]=248|u>>24;outU8Array[outIdx++]=128|u>>18&63;outU8Array[outIdx++]=128|u>>12&63;outU8Array[outIdx++]=128|u>>6&63;outU8Array[outIdx++]=128|u&63}else{if(outIdx+5>=endIdx)break;outU8Array[outIdx++]=252|u>>30;outU8Array[outIdx++]=128|u>>24&63;outU8Array[outIdx++]=128|u>>18&63;outU8Array[outIdx++]=128|u>>12&63;outU8Array[outIdx++]=128|u>>6&63;outU8Array[outIdx++]=128|u&63}}outU8Array[outIdx]=0;return outIdx-startIdx}function stringToUTF8(str,outPtr,maxBytesToWrite){return stringToUTF8Array(str,HEAPU8,outPtr,maxBytesToWrite)}function lengthBytesUTF8(str){var len=0;for(var i=0;i<str.length;++i){var u=str.charCodeAt(i);if(u>=55296&&u<=57343)u=65536+((u&1023)<<10)|str.charCodeAt(++i)&1023;if(u<=127){++len}else if(u<=2047){len+=2}else if(u<=65535){len+=3}else if(u<=2097151){len+=4}else if(u<=67108863){len+=5}else{len+=6}}return len}var UTF16Decoder=typeof TextDecoder!=="undefined"?new TextDecoder("utf-16le"):undefined;function demangle(func){return func}function demangleAll(text){var regex=/__Z[\w\d_]+/g;return text.replace(regex,(function(x){var y=demangle(x);return x===y?x:x+" ["+y+"]"}))}function jsStackTrace(){var err=new Error;if(!err.stack){try{throw new Error(0)}catch(e){err=e}if(!err.stack){return"(no stack trace available)"}}return err.stack.toString()}var WASM_PAGE_SIZE=65536;var ASMJS_PAGE_SIZE=16777216;var MIN_TOTAL_MEMORY=16777216;function alignUp(x,multiple){if(x%multiple>0){x+=multiple-x%multiple}return x}var buffer,HEAP8,HEAPU8,HEAP16,HEAPU16,HEAP32,HEAPU32,HEAPF32,HEAPF64;function updateGlobalBuffer(buf){Module["buffer"]=buffer=buf}function updateGlobalBufferViews(){Module["HEAP8"]=HEAP8=new Int8Array(buffer);Module["HEAP16"]=HEAP16=new Int16Array(buffer);Module["HEAP32"]=HEAP32=new Int32Array(buffer);Module["HEAPU8"]=HEAPU8=new Uint8Array(buffer);Module["HEAPU16"]=HEAPU16=new Uint16Array(buffer);Module["HEAPU32"]=HEAPU32=new Uint32Array(buffer);Module["HEAPF32"]=HEAPF32=new Float32Array(buffer);Module["HEAPF64"]=HEAPF64=new Float64Array(buffer)}var STATIC_BASE,STATICTOP,staticSealed;var STACK_BASE,STACKTOP,STACK_MAX;var DYNAMIC_BASE,DYNAMICTOP_PTR;STATIC_BASE=STATICTOP=STACK_BASE=STACKTOP=STACK_MAX=DYNAMIC_BASE=DYNAMICTOP_PTR=0;staticSealed=false;function abortOnCannotGrowMemory(){abort("Cannot enlarge memory arrays. Either (1) compile with  -s TOTAL_MEMORY=X  with X higher than the current value "+TOTAL_MEMORY+", (2) compile with  -s ALLOW_MEMORY_GROWTH=1  which allows increasing the size at runtime but prevents some optimizations, (3) set Module.TOTAL_MEMORY to a higher value before the program runs, or (4) if you want malloc to return NULL (0) instead of this abort, compile with  -s ABORTING_MALLOC=0 ")}if(!Module["reallocBuffer"])Module["reallocBuffer"]=(function(size){var ret;try{if(ArrayBuffer.transfer){ret=ArrayBuffer.transfer(buffer,size)}else{var oldHEAP8=HEAP8;ret=new ArrayBuffer(size);var temp=new Int8Array(ret);temp.set(oldHEAP8)}}catch(e){return false}var success=_emscripten_replace_memory(ret);if(!success)return false;return ret});function enlargeMemory(){var PAGE_MULTIPLE=Module["usingWasm"]?WASM_PAGE_SIZE:ASMJS_PAGE_SIZE;var LIMIT=2147483648-PAGE_MULTIPLE;if(HEAP32[DYNAMICTOP_PTR>>2]>LIMIT){return false}var OLD_TOTAL_MEMORY=TOTAL_MEMORY;TOTAL_MEMORY=Math.max(TOTAL_MEMORY,MIN_TOTAL_MEMORY);while(TOTAL_MEMORY<HEAP32[DYNAMICTOP_PTR>>2]){if(TOTAL_MEMORY<=536870912){TOTAL_MEMORY=alignUp(2*TOTAL_MEMORY,PAGE_MULTIPLE)}else{TOTAL_MEMORY=Math.min(alignUp((3*TOTAL_MEMORY+2147483648)/4,PAGE_MULTIPLE),LIMIT)}}var replacement=Module["reallocBuffer"](TOTAL_MEMORY);if(!replacement||replacement.byteLength!=TOTAL_MEMORY){TOTAL_MEMORY=OLD_TOTAL_MEMORY;return false}updateGlobalBuffer(replacement);updateGlobalBufferViews();return true}var byteLength;try{byteLength=Function.prototype.call.bind(Object.getOwnPropertyDescriptor(ArrayBuffer.prototype,"byteLength").get);byteLength(new ArrayBuffer(4))}catch(e){byteLength=(function(buffer){return buffer.byteLength})}var TOTAL_STACK=Module["TOTAL_STACK"]||5242880;var TOTAL_MEMORY=Module["TOTAL_MEMORY"]||33554432;if(TOTAL_MEMORY<TOTAL_STACK)Module.printErr("TOTAL_MEMORY should be larger than TOTAL_STACK, was "+TOTAL_MEMORY+"! (TOTAL_STACK="+TOTAL_STACK+")");if(Module["buffer"]){buffer=Module["buffer"]}else{{buffer=new ArrayBuffer(TOTAL_MEMORY)}Module["buffer"]=buffer}updateGlobalBufferViews();function getTotalMemory(){return TOTAL_MEMORY}HEAP32[0]=1668509029;HEAP16[1]=25459;if(HEAPU8[2]!==115||HEAPU8[3]!==99)throw"Runtime error: expected the system to be little-endian!";function callRuntimeCallbacks(callbacks){while(callbacks.length>0){var callback=callbacks.shift();if(typeof callback=="function"){callback();continue}var func=callback.func;if(typeof func==="number"){if(callback.arg===undefined){Module["dynCall_v"](func)}else{Module["dynCall_vi"](func,callback.arg)}}else{func(callback.arg===undefined?null:callback.arg)}}}var __ATPRERUN__=[];var __ATINIT__=[];var __ATMAIN__=[];var __ATEXIT__=[];var __ATPOSTRUN__=[];var runtimeInitialized=false;var runtimeExited=false;function preRun(){if(Module["preRun"]){if(typeof Module["preRun"]=="function")Module["preRun"]=[Module["preRun"]];while(Module["preRun"].length){addOnPreRun(Module["preRun"].shift())}}callRuntimeCallbacks(__ATPRERUN__)}function ensureInitRuntime(){if(runtimeInitialized)return;runtimeInitialized=true;callRuntimeCallbacks(__ATINIT__)}function preMain(){callRuntimeCallbacks(__ATMAIN__)}function exitRuntime(){callRuntimeCallbacks(__ATEXIT__);runtimeExited=true}function postRun(){if(Module["postRun"]){if(typeof Module["postRun"]=="function")Module["postRun"]=[Module["postRun"]];while(Module["postRun"].length){addOnPostRun(Module["postRun"].shift())}}callRuntimeCallbacks(__ATPOSTRUN__)}function addOnPreRun(cb){__ATPRERUN__.unshift(cb)}function addOnPostRun(cb){__ATPOSTRUN__.unshift(cb)}function writeArrayToMemory(array,buffer){HEAP8.set(array,buffer)}function writeAsciiToMemory(str,buffer,dontAddNull){for(var i=0;i<str.length;++i){HEAP8[buffer++>>0]=str.charCodeAt(i)}if(!dontAddNull)HEAP8[buffer>>0]=0}var Math_abs=Math.abs;var Math_cos=Math.cos;var Math_sin=Math.sin;var Math_tan=Math.tan;var Math_acos=Math.acos;var Math_asin=Math.asin;var Math_atan=Math.atan;var Math_atan2=Math.atan2;var Math_exp=Math.exp;var Math_log=Math.log;var Math_sqrt=Math.sqrt;var Math_ceil=Math.ceil;var Math_floor=Math.floor;var Math_pow=Math.pow;var Math_imul=Math.imul;var Math_fround=Math.fround;var Math_round=Math.round;var Math_min=Math.min;var Math_max=Math.max;var Math_clz32=Math.clz32;var Math_trunc=Math.trunc;var runDependencies=0;var runDependencyWatcher=null;var dependenciesFulfilled=null;function addRunDependency(id){runDependencies++;if(Module["monitorRunDependencies"]){Module["monitorRunDependencies"](runDependencies)}}function removeRunDependency(id){runDependencies--;if(Module["monitorRunDependencies"]){Module["monitorRunDependencies"](runDependencies)}if(runDependencies==0){if(runDependencyWatcher!==null){clearInterval(runDependencyWatcher);runDependencyWatcher=null}if(dependenciesFulfilled){var callback=dependenciesFulfilled;dependenciesFulfilled=null;callback()}}}Module["preloadedImages"]={};Module["preloadedAudios"]={};var memoryInitializer=null;var dataURIPrefix="data:application/octet-stream;base64,";function isDataURI(filename){return String.prototype.startsWith?filename.startsWith(dataURIPrefix):filename.indexOf(dataURIPrefix)===0}STATIC_BASE=GLOBAL_BASE;STATICTOP=STATIC_BASE+22016;__ATINIT__.push();memoryInitializer="data:application/octet-stream;base64,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AQAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAwAAAAUAAAAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAAAAAAAAAAAAAABQAAAAAAAAAAAAAAAAAAAAUAAAABAAAAAAAAAAAAAAABAAAAAwAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAQAAAAMAAAAAAAAAAAAAAAEAAAAAAAAAAwAAAAMAAAADAAAAAAAAAAAAAAAAAAAAAAAAAAUAAAAAAAAAAAAAAAMAAAAFAAAAAQAAAAAAAAAAAAAAAQAAAAAAAAABAAAAAAAAAAEAAAAAAAAA/////wMAAAAAAAAABQAAAAIAAAAAAAAAAAAAAAUAAAAAAAAAAAAAAAQAAAAFAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAAAAAAAAAAAAAAAwAAAAMAAAADAAAAAwAAAAAAAAADAAAAAAAAAAAAAAAAAAAAAwAAAAUAAAAFAAAAAAAAAAAAAAADAAAAAwAAAAMAAAAAAAAAAAAAAAAAAAAAAAAAAwAAAAMAAAADAAAAAAAAAAMAAAAAAAAAAAAAAAAAAAAAAAAAAwAAAAUAAAAFAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAABAAAAAAAAAAEAAAAAAAAAAwAAAAMAAAADAAAAAAAAAAMAAAAAAAAAAAAAAP////8DAAAAAAAAAAUAAAACAAAAAAAAAAAAAAAAAAAAAAAAAAMAAAAAAAAAAAAAAAMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUAAAAAAAAAAAAAAAMAAAAAAAAAAAAAAAAAAAADAAAAAwAAAAAAAAAAAAAAAQAAAAAAAAABAAAAAAAAAAEAAAAAAAAAAAAAAAEAAAADAAAAAAAAAAAAAAABAAAAAAAAAAMAAAADAAAAAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAAAAAAAAAAAAAAAwAAAAMAAAADAAAAAwAAAAAAAAADAAAAAAAAAAAAAAABAAAAAwAAAAAAAAAAAAAAAQAAAAAAAAADAAAAAwAAAAMAAAADAAAAAAAAAAMAAAAAAAAAAAAAAAMAAAAAAAAAAwAAAAAAAAADAAAAAAAAAAAAAAAAAAAAAwAAAAAAAAAAAAAAAwAAAAAAAAADAAAAAAAAAAAAAAAAAAAAAwAAAAMAAAAAAAAA/////wMAAAAAAAAABQAAAAIAAAAAAAAAAAAAAAMAAAAAAAAAAAAAAAMAAAADAAAAAAAAAAAAAAADAAAAAAAAAAAAAAADAAAAAwAAAAAAAAAAAAAAAAAAAAAAAAADAAAABQAAAAUAAAAAAAAAAAAAAAAAAAAAAAAAAwAAAAUAAAAFAAAAAAAAAAAAAAADAAAAAwAAAAMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAADAAAAAAAAAAAAAAABAAAAAAAAAAAAAAADAAAAAAAAAAAAAAADAAAAAwAAAAAAAAAAAAAAAAAAAAMAAAAAAAAAAwAAAAAAAAAAAAAAAwAAAAMAAAADAAAAAAAAAAMAAAAAAAAAAAAAAAMAAAADAAAAAwAAAAAAAAADAAAAAAAAAAAAAAD/////AwAAAAAAAAAFAAAAAgAAAAAAAAAAAAAAAAAAAAAAAAADAAAAAAAAAAAAAAADAAAAAAAAAAMAAAAAAAAAAAAAAAAAAAADAAAAAwAAAAAAAAAAAAAAAwAAAAAAAAADAAAAAAAAAAMAAAAAAAAAAwAAAAMAAAADAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADAAAAAAAAAAMAAAAAAAAAAwAAAAAAAAAAAAAAAwAAAAAAAAAAAAAAAwAAAAMAAAAAAAAAAwAAAAMAAAADAAAAAAAAAAAAAAADAAAAAAAAAAAAAAAAAAAAAwAAAAAAAAADAAAAAAAAAAAAAAD/////AwAAAAAAAAAFAAAAAgAAAAAAAAAAAAAAAwAAAAMAAAADAAAAAwAAAAMAAAAAAAAAAAAAAAMAAAADAAAAAwAAAAMAAAADAAAAAAAAAAAAAAADAAAAAwAAAAMAAAADAAAAAAAAAAMAAAAAAAAAAwAAAAMAAAADAAAAAwAAAAAAAAADAAAAAAAAAP////8DAAAAAAAAAAUAAAACAAAAAAAAAAAAAAAAAAAAAAAAAAMAAAAAAAAAAAAAAAMAAAAAAAAAAwAAAAMAAAADAAAAAAAAAAMAAAAAAAAAAAAAAAMAAAAAAAAAAAAAAAAAAAADAAAAAwAAAAAAAAADAAAAAAAAAAAAAAADAAAAAwAAAAAAAAAAAAAAAwAAAAMAAAADAAAAAAAAAAAAAAAAAAAAAAAAAAMAAAAAAAAAAAAAAAMAAAADAAAAAAAAAAAAAAAAAAAAAwAAAAAAAAAAAAAAAwAAAAMAAAAAAAAAAAAAAAAAAAADAAAAAAAAAAMAAAAAAAAAAAAAAP////8DAAAAAAAAAAUAAAACAAAAAAAAAAAAAAADAAAAAwAAAAMAAAAAAAAAAAAAAAMAAAAAAAAAAwAAAAMAAAADAAAAAAAAAAAAAAADAAAAAAAAAAAAAAAAAAAAAwAAAAAAAAAAAAAAAwAAAAAAAAADAAAAAAAAAAAAAAAAAAAAAwAAAAMAAAAAAAAAAAAAAAAAAAADAAAAAAAAAAUAAAAAAAAAAAAAAAMAAAADAAAAAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAMAAAABAAAAAAAAAAEAAAAAAAAAAAAAAAEAAAADAAAAAQAAAAAAAAABAAAAAAAAAAAAAAADAAAAAAAAAAMAAAAAAAAAAwAAAAAAAAAAAAAAAwAAAAAAAAADAAAAAAAAAAMAAAAAAAAA/////wMAAAAAAAAABQAAAAIAAAAAAAAAAAAAAAAAAAADAAAAAAAAAAAAAAADAAAAAwAAAAAAAAAAAAAAAAAAAAMAAAAAAAAAAwAAAAAAAAAAAAAAAwAAAAAAAAAAAAAAAwAAAAMAAAAAAAAAAAAAAAMAAAADAAAAAwAAAAMAAAADAAAAAAAAAAAAAAAAAAAAAAAAAAMAAAAAAAAABQAAAAAAAAAAAAAAAwAAAAMAAAADAAAAAwAAAAMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAADAAAAAwAAAAMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADAAAAAAAAAAUAAAAAAAAAAAAAAAUAAAAAAAAAAAAAAAUAAAAFAAAAAAAAAAAAAAAAAAAAAwAAAAAAAAAAAAAAAwAAAAMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAwAAAAAAAAADAAAAAAAAAAAAAAD/////AwAAAAAAAAAFAAAAAgAAAAAAAAAAAAAAAwAAAAMAAAADAAAAAAAAAAAAAAADAAAAAAAAAAUAAAAAAAAAAAAAAAUAAAAFAAAAAAAAAAAAAAAAAAAAAQAAAAMAAAABAAAAAAAAAAEAAAAAAAAAAwAAAAMAAAADAAAAAAAAAAAAAAADAAAAAAAAAAMAAAADAAAAAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAMAAAABAAAAAAAAAAEAAAAAAAAAAwAAAAMAAAADAAAAAwAAAAMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAQAAAAAAAAADAAAABQAAAAEAAAAAAAAA/////wMAAAAAAAAABQAAAAIAAAAAAAAAAAAAAAUAAAAAAAAAAAAAAAUAAAAFAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAEAAAABQAAAAEAAAAAAAAAAwAAAAMAAAADAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwAAAAAAAAAFAAAAAAAAAAAAAAAAAAAAAAAAAAMAAAAAAAAABQAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAgAAAAUAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAQAAAAMAAAABAAAAAAAAAAEAAAAAAAAABQAAAAAAAAAAAAAABQAAAAUAAAAAAAAAAAAAAP////8BAAAAAAAAAAMAAAAEAAAAAgAAAAAAAAAAAAAAAQAAAAAAAAAAAAAABQAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAUAAAAAAAAAAAAAAAUAAAAFAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAABAAAABQAAAAEAAAABAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAEAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAAAAAAAAAAAAAAEAAAD//////////wEAAAABAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAQAAAAEAAAAAAAAAAAAAAAAAAAADAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwAAAAEAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAsAAAACAAAAAAAAAAAAAAABAAAAAgAAAAYAAAAEAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAYAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAgAAAAAAAAABAAAAAQAAAAAAAAAAAAAAAAAAAAcAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAACAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAYAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAKAAAAAgAAAAAAAAAAAAAAAQAAAAEAAAAFAAAABgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAALAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAEAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAMAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAABAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAABwAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAsAAAABAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwAAAACAAAAAAAAAAAAAAABAAAAAwAAAAcAAAAGAAAAAQAAAAAAAAABAAAAAAAAAAAAAAAAAAAABwAAAAEAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAADAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAwAAAAAAAAABAAAAAQAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAGAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAFAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAADgAAAAIAAAAAAAAAAAAAAAEAAAAAAAAACQAAAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgAAAAEAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAQAAAAEAAAAAAAAAAAAAAAAAAAAMAAAAAQAAAAEAAAAAAAAAAAAAAAAAAAAAAAAABwAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAsAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADQAAAAIAAAAAAAAAAAAAAAEAAAAEAAAACAAAAAoAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAALAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAACQAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAGAAAAAgAAAAAAAAAAAAAAAQAAAAsAAAAPAAAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAkAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAOAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAAAAEAAAAAAAAAAQAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAQAAAAEAAAAAAAAAAAAAAAAAAAAIAAAAAQAAAAAAAAABAAAAAAAAAAAAAAAAAAAABQAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHAAAAAgAAAAAAAAAAAAAAAQAAAAwAAAAQAAAADAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAoAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAJAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADQAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAPAAAAAAAAAAEAAAABAAAAAAAAAAAAAAAAAAAADwAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAOAAAAAQAAAAEAAAAAAAAAAAAAAAAAAAAAAAAADQAAAAEAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAUAAAACAAAAAAAAAAAAAAABAAAACgAAABMAAAAIAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAkAAAABAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAOAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAEQAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAwAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEQAAAAAAAAABAAAAAQAAAAAAAAAAAAAAAAAAAA8AAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAQAAAAAQAAAAAAAAABAAAAAAAAAAAAAAAAAAAACQAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAANAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAIAAAAAAAAAAAAAAAEAAAANAAAAEQAAAA0AAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAARAAAAAQAAAAAAAAABAAAAAAAAAAAAAAAAAAAAEwAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAA4AAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAATAAAAAAAAAAEAAAABAAAAAAAAAAAAAAAAAAAAEQAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAA0AAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAARAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAkAAAACAAAAAAAAAAAAAAABAAAADgAAABIAAAAPAAAAAQAAAAAAAAABAAAAAAAAAAAAAAAAAAAADwAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABIAAAAAAAAAAQAAAAEAAAAAAAAAAAAAAAAAAAASAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAEwAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAABEAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAATAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEgAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAABIAAAABAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAATAAAAAgAAAAAAAAAAAAAAAQAAAP//////////EwAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAATAAAAAQAAAAAAAAABAAAAAAAAAAAAAAAAAAAAEgAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAEgAAAAAAAAAYAAAAAAAAACEAAAAAAAAAHgAAAAAAAAAgAAAAAwAAADEAAAABAAAAMAAAAAMAAAAyAAAAAwAAAAgAAAAAAAAABQAAAAUAAAAKAAAABQAAABYAAAAAAAAAEAAAAAAAAAASAAAAAAAAACkAAAABAAAAIQAAAAAAAAAeAAAAAAAAAAQAAAAAAAAAAAAAAAUAAAACAAAABQAAAA8AAAABAAAACAAAAAAAAAAFAAAABQAAAB8AAAABAAAAFgAAAAAAAAAQAAAAAAAAAAIAAAAAAAAABgAAAAAAAAAOAAAAAAAAAAoAAAAAAAAACwAAAAAAAAARAAAAAwAAABgAAAABAAAAFwAAAAMAAAAZAAAAAwAAAAAAAAAAAAAAAQAAAAUAAAAJAAAABQAAAAUAAAAAAAAAAgAAAAAAAAAGAAAAAAAAABIAAAABAAAACgAAAAAAAAALAAAAAAAAAAQAAAABAAAAAwAAAAUAAAAHAAAABQAAAAgAAAABAAAAAAAAAAAAAAABAAAABQAAABAAAAABAAAABQAAAAAAAAACAAAAAAAAAAcAAAAAAAAAFQAAAAAAAAAmAAAAAAAAAAkAAAAAAAAAEwAAAAAAAAAiAAAAAwAAAA4AAAABAAAAFAAAAAMAAAAkAAAAAwAAAAMAAAAAAAAADQAAAAUAAAAdAAAA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AAAAAGQAAAAAAAAAZgAAAAAAAABlAAAAAwAAAFMAAAABAAAAVwAAAAMAAABVAAAAAwAAAHYAAAAAAAAAeAAAAAAAAABzAAAABQAAAGwAAAABAAAAcgAAAAAAAABwAAAAAAAAAFwAAAABAAAAZAAAAAAAAABmAAAAAAAAAHUAAAAAAAAAeQAAAAUAAAB3AAAABQAAAG0AAAABAAAAdgAAAAAAAAB4AAAAAAAAAF8AAAABAAAAbAAAAAEAAAByAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAABAAAAAAAAAAAAAAABAAAAAQAAAAEAAAAAAAAAAAAAAAEAAAAAAAAAAQAAAAEAAAABAAAAAAAAAAIAAAABAAAAAAAAAAEAAAACAAAAAAAAAAAAAAACAAAAAQAAAAAAAAABAAAAAgAAAAEAAAAAAAAAAgAAAAUAAAAEAAAAAAAAAAEAAAAFAAAAAAAAAAAAAAAFAAAABAAAAAAAAAABAAAABQAAAAQAAAAAAAAABQAAAAEAAAD/////BwAAAP////8xAAAA/////1cBAAD/////YQkAAP////+nQQAA/////5HLAQD/////95AMAP/////B9lcAAgAAAP////8OAAAA/////2IAAAD/////rgIAAP/////CEgAA/////06DAAD/////IpcDAP/////uIRkA/////4LtrwAAAAAAAgAAAP//////////AQAAAAMAAAD//////////////////////////////////////////////////////////////////////////wEAAAAAAAAAAgAAAP///////////////wMAAAD//////////////////////////////////////////////////////////////////////////wEAAAAAAAAAAgAAAP///////////////wMAAAD//////////////////////////////////////////////////////////////////////////wEAAAAAAAAAAgAAAP///////////////wMAAAD//////////////////////////////////////////////////////////wIAAAD//////////wEAAAAAAAAA/////////////////////wMAAAD/////////////////////////////////////////////////////AwAAAP////////////////////8AAAAA/////////////////////wEAAAD///////////////8CAAAA////////////////////////////////AwAAAP////////////////////8AAAAA////////////////AgAAAAEAAAD/////////////////////////////////////////////////////AwAAAP////////////////////8AAAAA////////////////AgAAAAEAAAD/////////////////////////////////////////////////////AwAAAP////////////////////8AAAAA////////////////AgAAAAEAAAD/////////////////////////////////////////////////////AwAAAP////////////////////8AAAAA////////////////AgAAAAEAAAD/////////////////////////////////////////////////////AQAAAAIAAAD///////////////8AAAAA/////////////////////wMAAAD/////////////////////////////////////////////////////AQAAAAIAAAD///////////////8AAAAA/////////////////////wMAAAD/////////////////////////////////////////////////////AQAAAAIAAAD///////////////8AAAAA/////////////////////wMAAAD/////////////////////////////////////////////////////AQAAAAIAAAD///////////////8AAAAA/////////////////////wMAAAD///////////////////////////////8CAAAA////////////////AQAAAP////////////////////8AAAAA/////////////////////wMAAAD/////////////////////////////////////////////////////AwAAAP////////////////////8AAAAAAQAAAP//////////AgAAAP//////////////////////////////////////////////////////////AwAAAP///////////////wIAAAAAAAAAAQAAAP//////////////////////////////////////////////////////////////////////////AwAAAP///////////////wIAAAAAAAAAAQAAAP//////////////////////////////////////////////////////////////////////////AwAAAP///////////////wIAAAAAAAAAAQAAAP//////////////////////////////////////////////////////////////////////////AwAAAAEAAAD//////////wIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAgAAAAAAAAACAAAAAQAAAAEAAAACAAAAAgAAAAAAAAAFAAAABQAAAAAAAAACAAAAAgAAAAMAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAAAAAAIAAAABAAAAAgAAAAIAAAACAAAAAAAAAAUAAAAGAAAAAAAAAAIAAAACAAAAAwAAAAIAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAIAAAAAAAAAAgAAAAEAAAADAAAAAgAAAAIAAAAAAAAABQAAAAcAAAAAAAAAAgAAAAIAAAADAAAAAwAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAgAAAAAAAAACAAAAAQAAAAQAAAACAAAAAgAAAAAAAAAFAAAACAAAAAAAAAACAAAAAgAAAAMAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAMAAAACAAAAAAAAAAIAAAABAAAAAAAAAAIAAAACAAAAAAAAAAUAAAAJAAAAAAAAAAIAAAACAAAAAwAAAAUAAAAAAAAAAAAAAAAAAAAAAAAACgAAAAIAAAACAAAAAAAAAAMAAAAOAAAAAgAAAAAAAAACAAAAAwAAAAAAAAAAAAAAAgAAAAIAAAADAAAABgAAAAAAAAAAAAAAAAAAAAAAAAALAAAAAgAAAAIAAAAAAAAAAwAAAAoAAAACAAAAAAAAAAIAAAADAAAAAQAAAAAAAAACAAAAAgAAAAMAAAAHAAAAAAAAAAAAAAAAAAAAAAAAAAwAAAACAAAAAgAAAAAAAAADAAAACwAAAAIAAAAAAAAAAgAAAAMAAAACAAAAAAAAAAIAAAACAAAAAwAAAAgAAAAAAAAAAAAAAAAAAAAAAAAADQAAAAIAAAACAAAAAAAAAAMAAAAMAAAAAgAAAAAAAAACAAAAAwAAAAMAAAAAAAAAAgAAAAIAAAADAAAACQAAAAAAAAAAAAAAAAAAAAAAAAAOAAAAAgAAAAIAAAAAAAAAAwAAAA0AAAACAAAAAAAAAAIAAAADAAAABAAAAAAAAAACAAAAAgAAAAMAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAUAAAACAAAAAgAAAAAAAAADAAAABgAAAAIAAAAAAAAAAgAAAAMAAAAPAAAAAAAAAAIAAAACAAAAAwAAAAsAAAAAAAAAAAAAAAAAAAAAAAAABgAAAAIAAAACAAAAAAAAAAMAAAAHAAAAAgAAAAAAAAACAAAAAwAAABAAAAAAAAAAAgAAAAIAAAADAAAADAAAAAAAAAAAAAAAAAAAAAAAAAAHAAAAAgAAAAIAAAAAAAAAAwAAAAgAAAACAAAAAAAAAAIAAAADAAAAEQAAAAAAAAACAAAAAgAAAAMAAAANAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAACAAAAAgAAAAAAAAADAAAACQAAAAIAAAAAAAAAAgAAAAMAAAASAAAAAAAAAAIAAAACAAAAAwAAAA4AAAAAAAAAAAAAAAAAAAAAAAAACQAAAAIAAAACAAAAAAAAAAMAAAAFAAAAAgAAAAAAAAACAAAAAwAAABMAAAAAAAAAAgAAAAIAAAADAAAADwAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAgAAAAAAAAACAAAAAQAAABMAAAACAAAAAgAAAAAAAAAFAAAACgAAAAAAAAACAAAAAgAAAAMAAAAQAAAAAAAAAAAAAAAAAAAAAAAAABEAAAACAAAAAAAAAAIAAAABAAAADwAAAAIAAAACAAAAAAAAAAUAAAALAAAAAAAAAAIAAAACAAAAAwAAABEAAAAAAAAAAAAAAAAAAAAAAAAAEgAAAAIAAAAAAAAAAgAAAAEAAAAQAAAAAgAAAAIAAAAAAAAABQAAAAwAAAAAAAAAAgAAAAIAAAADAAAAEgAAAAAAAAAAAAAAAAAAAAAAAAATAAAAAgAAAAAAAAACAAAAAQAAABEAAAACAAAAAgAAAAAAAAAFAAAADQAAAAAAAAACAAAAAgAAAAMAAAATAAAAAAAAAAAAAAAAAAAAAAAAAA8AAAACAAAAAAAAAAIAAAABAAAAEgAAAAIAAAACAAAAAAAAAAUAAAAOAAAAAAAAAAIAAAACAAAAAwAAAAIAAAABAAAAAAAAAAEAAAACAAAAAAAAAAAAAAACAAAAAQAAAAAAAAABAAAAAgAAAAEAAAAAAAAAAgAAAAIAAAAAAAAAAQAAAAUAAAAEAAAAAAAAAAEAAAAFAAAAAAAAAAAAAAAFAAAABAAAAAAAAAABAAAABQAAAAQAAAAAAAAABQAAAAUAAAAAAAAAAQAAAAAAAAADAAAABgAAAAIAAAAFAAAAAQAAAAQAAAAAAAAABQAAAAMAAAABAAAABgAAAAQAAAACAAAAKG1heElkeCkgPiAwAGFsZ29zLmMAa1JpbmcAKGdlb1BvbHlnb24tPm51bUhvbGVzICsgMSkgPiAwAHBvbHlmaWxsAGFkamFjZW50RmFjZURpclt0bXBGaWprLmZhY2VdW2ZpamsuZmFjZV0gPT0gS0kAZmFjZWlqay5jAF9mYWNlSWprUGVudFRvR2VvQm91bmRhcnkAYWRqYWNlbnRGYWNlRGlyW2NlbnRlcklKSy5mYWNlXVtmYWNlMl0gPT0gS0kAX2ZhY2VJamtUb0dlb0JvdW5kYXJ5AChudW1IZXhlcykgPiAwAGgzSW5kZXguYwBjb21wYWN0AChtYXhDb21wYWN0YWJsZUNvdW50KSA+IDAAbGlua2VkR2VvLmMAbG9vcCAhPSBOVUxMAGFkZExpbmtlZExvb3AAcG9seWdvbi0+Zmlyc3QgPT0gTlVMTABjb29yZCAhPSBOVUxMAGFkZExpbmtlZENvb3JkAGxvb3AtPmZpcnN0ID09IE5VTEwAZ3JhcGgtPmJ1Y2tldHMgIT0gTlVMTAB2ZXJ0ZXhHcmFwaC5jAGluaXRWZXJ0ZXhHcmFwaABub2RlICE9IE5VTEwAYWRkVmVydGV4Tm9kZQ==";var tempDoublePtr=STATICTOP;STATICTOP+=16;function ___assert_fail(condition,filename,line,func){abort("Assertion failed: "+Pointer_stringify(condition)+", at: "+[filename?Pointer_stringify(filename):"unknown filename",line,func?Pointer_stringify(func):"unknown function"])}var cttz_i8=allocate([8,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,5,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,6,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,5,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,7,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,5,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,6,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,5,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0],"i8",ALLOC_STATIC);var _llvm_ceil_f64=Math_ceil;var _llvm_fabs_f64=Math_abs;var _llvm_pow_f64=Math_pow;function _llvm_stackrestore(p){var self=_llvm_stacksave;var ret=self.LLVM_SAVEDSTACKS[p];self.LLVM_SAVEDSTACKS.splice(p,1);stackRestore(ret)}function _llvm_stacksave(){var self=_llvm_stacksave;if(!self.LLVM_SAVEDSTACKS){self.LLVM_SAVEDSTACKS=[]}self.LLVM_SAVEDSTACKS.push(stackSave());return self.LLVM_SAVEDSTACKS.length-1}function _emscripten_memcpy_big(dest,src,num){HEAPU8.set(HEAPU8.subarray(src,src+num),dest);return dest}function ___setErrNo(value){if(Module["___errno_location"])HEAP32[Module["___errno_location"]()>>2]=value;return value}DYNAMICTOP_PTR=staticAlloc(4);STACK_BASE=STACKTOP=alignMemory(STATICTOP);STACK_MAX=STACK_BASE+TOTAL_STACK;DYNAMIC_BASE=alignMemory(STACK_MAX);HEAP32[DYNAMICTOP_PTR>>2]=DYNAMIC_BASE;staticSealed=true;var ASSERTIONS=false;function intArrayToString(array){var ret=[];for(var i=0;i<array.length;i++){var chr=array[i];if(chr>255){if(ASSERTIONS){assert(false,"Character code "+chr+" ("+String.fromCharCode(chr)+")  at offset "+i+" not in 0x00-0xFF.")}chr&=255}ret.push(String.fromCharCode(chr))}return ret.join("")}var decodeBase64=typeof atob==="function"?atob:(function(input){var keyStr="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";var output="";var chr1,chr2,chr3;var enc1,enc2,enc3,enc4;var i=0;input=input.replace(/[^A-Za-z0-9\+\/\=]/g,"");do{enc1=keyStr.indexOf(input.charAt(i++));enc2=keyStr.indexOf(input.charAt(i++));enc3=keyStr.indexOf(input.charAt(i++));enc4=keyStr.indexOf(input.charAt(i++));chr1=enc1<<2|enc2>>4;chr2=(enc2&15)<<4|enc3>>2;chr3=(enc3&3)<<6|enc4;output=output+String.fromCharCode(chr1);if(enc3!==64){output=output+String.fromCharCode(chr2)}if(enc4!==64){output=output+String.fromCharCode(chr3)}}while(i<input.length);return output});function intArrayFromBase64(s){if(typeof ENVIRONMENT_IS_NODE==="boolean"&&ENVIRONMENT_IS_NODE){var buf;try{buf=Buffer.from(s,"base64")}catch(_){buf=new Buffer(s,"base64")}return new Uint8Array(buf.buffer,buf.byteOffset,buf.byteLength)}try{var decoded=decodeBase64(s);var bytes=new Uint8Array(decoded.length);for(var i=0;i<decoded.length;++i){bytes[i]=decoded.charCodeAt(i)}return bytes}catch(_){throw new Error("Converting base64 string to bytes failed.")}}function tryParseAsDataURI(filename){if(!isDataURI(filename)){return}return intArrayFromBase64(filename.slice(dataURIPrefix.length))}Module.asmGlobalArg={"Math":Math,"Int8Array":Int8Array,"Int16Array":Int16Array,"Int32Array":Int32Array,"Uint8Array":Uint8Array,"Uint16Array":Uint16Array,"Uint32Array":Uint32Array,"Float32Array":Float32Array,"Float64Array":Float64Array,"NaN":NaN,"Infinity":Infinity,"byteLength":byteLength};Module.asmLibraryArg={"abort":abort,"assert":assert,"enlargeMemory":enlargeMemory,"getTotalMemory":getTotalMemory,"abortOnCannotGrowMemory":abortOnCannotGrowMemory,"___assert_fail":___assert_fail,"___setErrNo":___setErrNo,"_emscripten_memcpy_big":_emscripten_memcpy_big,"_llvm_ceil_f64":_llvm_ceil_f64,"_llvm_fabs_f64":_llvm_fabs_f64,"_llvm_pow_f64":_llvm_pow_f64,"_llvm_stackrestore":_llvm_stackrestore,"_llvm_stacksave":_llvm_stacksave,"DYNAMICTOP_PTR":DYNAMICTOP_PTR,"tempDoublePtr":tempDoublePtr,"ABORT":ABORT,"STACKTOP":STACKTOP,"STACK_MAX":STACK_MAX,"cttz_i8":cttz_i8};// EMSCRIPTEN_START_ASM
var asm=(/** @suppress {uselessCode} */ function(global,env,buffer) {
"almost asm";var a=global.Int8Array;var b=new a(buffer);var c=global.Int16Array;var d=new c(buffer);var e=global.Int32Array;var f=new e(buffer);var g=global.Uint8Array;var h=new g(buffer);var i=global.Uint16Array;var j=new i(buffer);var k=global.Uint32Array;var l=new k(buffer);var m=global.Float32Array;var n=new m(buffer);var o=global.Float64Array;var p=new o(buffer);var q=global.byteLength;var r=env.DYNAMICTOP_PTR|0;var s=env.tempDoublePtr|0;var t=env.ABORT|0;var u=env.STACKTOP|0;var v=env.STACK_MAX|0;var w=env.cttz_i8|0;var x=0;var y=0;var z=0;var A=0;var B=global.NaN,C=global.Infinity;var D=0,E=0,F=0,G=0,H=0.0;var I=0;var J=global.Math.floor;var K=global.Math.abs;var L=global.Math.sqrt;var M=global.Math.pow;var N=global.Math.cos;var O=global.Math.sin;var P=global.Math.tan;var Q=global.Math.acos;var R=global.Math.asin;var S=global.Math.atan;var T=global.Math.atan2;var U=global.Math.exp;var V=global.Math.log;var W=global.Math.ceil;var X=global.Math.imul;var Y=global.Math.min;var Z=global.Math.max;var _=global.Math.clz32;var $=env.abort;var aa=env.assert;var ba=env.enlargeMemory;var ca=env.getTotalMemory;var da=env.abortOnCannotGrowMemory;var ea=env.___assert_fail;var fa=env.___setErrNo;var ga=env._emscripten_memcpy_big;var ha=env._llvm_ceil_f64;var ia=env._llvm_fabs_f64;var ja=env._llvm_pow_f64;var ka=env._llvm_stackrestore;var la=env._llvm_stacksave;var ma=0.0;function na(newBuffer){if(q(newBuffer)&16777215||q(newBuffer)<=16777215||q(newBuffer)>2147483648)return false;b=new a(newBuffer);d=new c(newBuffer);f=new e(newBuffer);h=new g(newBuffer);j=new i(newBuffer);l=new k(newBuffer);n=new m(newBuffer);p=new o(newBuffer);buffer=newBuffer;return true}
// EMSCRIPTEN_START_FUNCS
function oa(a){a=a|0;var b=0;b=u;u=u+a|0;u=u+15&-16;return b|0}function pa(){return u|0}function qa(a){a=a|0;u=a}function ra(a,b){a=a|0;b=b|0;u=a;v=b}function sa(a,b){a=a|0;b=b|0;if(!x){x=a;y=b}}function ta(a){a=a|0;I=a}function ua(){return I|0}function va(a){a=a|0;var b=0;if((a|0)<=0){a=1;return a|0}b=Lc(a+-1|0,0,a+-2|0,0)|0;b=Rc(b|0,I&1|0,1)|0;a=(a*12|0)+(b*6|0)+-5|0;return a|0}function wa(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;var e=0,g=0,h=0,i=0;i=u;do if((c|0)>0){g=Lc(c+-1|0,0,c+-2|0,0)|0;g=Rc(g|0,I&1|0,1)|0;g=(c*12|0)+-5+(g*6|0)|0;if((g|0)>0){h=u;u=u+((1*(g<<2)|0)+15&-16)|0;Uc(h|0,0,g<<2|0)|0;e=g;break}else ea(21044,21057,94,21065)}else{h=u;u=u+16|0;f[h>>2]=0;e=1}while(0);if(!(ya(a,b,c,d,h)|0)){u=i;return}Uc(d|0,0,e<<3|0)|0;Uc(h|0,0,e<<2|0)|0;za(a,b,c,d,h,e,0);u=i;return}function xa(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;var g=0,h=0,i=0;if((c|0)>0){h=Lc(c+-1|0,0,c+-2|0,0)|0;h=Rc(h|0,I&1|0,1)|0;h=(c*12|0)+-5+(h*6|0)|0}else h=1;if(!(ya(a,b,c,d,e)|0))return;if((h|0)>0){g=0;do{i=d+(g<<3)|0;f[i>>2]=0;f[i+4>>2]=0;f[e+(g<<2)>>2]=0;g=g+1|0}while((g|0)!=(h|0))}za(a,b,c,d,e,h,0);return}function ya(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;var g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0;p=u;u=u+16|0;o=p;g=d;f[g>>2]=a;f[g+4>>2]=b;g=(e|0)!=0;if(g)f[e>>2]=0;if(Ib(a,b)|0){o=1;u=p;return o|0}f[o>>2]=0;a:do if(g){k=0;l=0;m=1;n=1;g=a;while(1){if((m|0)>(c|0)){g=0;break a}if(!(k|l)){g=Aa(g,b,4,o)|0;b=I;if((g|0)==0&(b|0)==0){g=2;break a}if(Ib(g,b)|0){g=1;break a}}g=Aa(g,b,f[1928+(l<<2)>>2]|0,o)|0;b=I;if((g|0)==0&(b|0)==0){g=2;break a}a=d+(n<<3)|0;f[a>>2]=g;f[a+4>>2]=b;f[e+(n<<2)>>2]=m;a=k+1|0;h=(a|0)==(m|0);i=l+1|0;j=(i|0)==6;if(Ib(g,b)|0){g=1;break}else{k=h?0:a;l=h?(j?0:i):l;m=m+(j&h&1)|0;n=n+1|0}}}else{k=0;l=0;m=1;n=1;g=a;while(1){if((m|0)>(c|0)){g=0;break a}if(!(k|l)){g=Aa(g,b,4,o)|0;b=I;if((g|0)==0&(b|0)==0){g=2;break a}if(Ib(g,b)|0){g=1;break a}}g=Aa(g,b,f[1928+(l<<2)>>2]|0,o)|0;b=I;if((g|0)==0&(b|0)==0){g=2;break a}a=d+(n<<3)|0;f[a>>2]=g;f[a+4>>2]=b;a=k+1|0;h=(a|0)==(m|0);i=l+1|0;j=(i|0)==6;if(Ib(g,b)|0){g=1;break}else{k=h?0:a;l=h?(j?0:i):l;m=m+(j&h&1)|0;n=n+1|0}}}while(0);o=g;u=p;return o|0}function za(a,b,c,d,e,g,h){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;g=g|0;h=h|0;var i=0,j=0,k=0,l=0,m=0,n=0,o=0;m=u;u=u+16|0;l=m;if((a|0)==0&(b|0)==0){u=m;return}i=Qc(a|0,b|0,g|0,((g|0)<0)<<31>>31|0)|0;j=d+(i<<3)|0;n=j;o=f[n>>2]|0;n=f[n+4>>2]|0;k=(o|0)==(a|0)&(n|0)==(b|0);if(!((o|0)==0&(n|0)==0|k))do{i=i+1|0;i=(i|0)>=(g|0)?0:i;j=d+(i<<3)|0;o=j;n=f[o>>2]|0;o=f[o+4>>2]|0;k=(n|0)==(a|0)&(o|0)==(b|0)}while(!((n|0)==0&(o|0)==0|k));i=e+(i<<2)|0;if(k?(f[i>>2]|0)<=(h|0):0){u=m;return}o=j;f[o>>2]=a;f[o+4>>2]=b;f[i>>2]=h;if((h|0)>=(c|0)){u=m;return}o=h+1|0;f[l>>2]=0;n=Aa(a,b,2,l)|0;za(n,I,c,d,e,g,o);f[l>>2]=0;n=Aa(a,b,3,l)|0;za(n,I,c,d,e,g,o);f[l>>2]=0;n=Aa(a,b,1,l)|0;za(n,I,c,d,e,g,o);f[l>>2]=0;n=Aa(a,b,5,l)|0;za(n,I,c,d,e,g,o);f[l>>2]=0;n=Aa(a,b,4,l)|0;za(n,I,c,d,e,g,o);f[l>>2]=0;n=Aa(a,b,6,l)|0;za(n,I,c,d,e,g,o);u=m;return}function Aa(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;var e=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0;if((f[d>>2]|0)>0){e=0;do{c=fb(c)|0;e=e+1|0}while((e|0)<(f[d>>2]|0))}k=Rc(a|0,b|0,45)|0;l=k&127;j=Nb(a,b)|0;g=Rc(a|0,b|0,52)|0;g=(g&15)+-1|0;while(1){if((g|0)==-1){h=5;break}i=(14-g|0)*3|0;m=Rc(a|0,b|0,i|0)|0;m=m&7;n=(Sb(g+1|0)|0)==0;e=Sc(7,0,i|0)|0;b=b&~I;o=f[(n?2344:1952)+(m*28|0)+(c<<2)>>2]|0;i=Sc(o|0,((o|0)<0)<<31>>31|0,i|0)|0;c=f[(n?2540:2148)+(m*28|0)+(c<<2)>>2]|0;a=i|a&~e;b=I|b;e=(c|0)==0;if(e){c=0;break}else g=g+((e^1)<<31>>31)|0}if((h|0)==5){o=f[2736+(l*28|0)+(c<<2)>>2]|0;n=Sc(o|0,0,45)|0;a=n|a;b=I|b&-1040385;c=f[6152+(l*28|0)+(c<<2)>>2]|0;if((o&127|0)==127){o=Sc(f[2736+(l*28|0)+20>>2]|0,0,45)|0;c=f[6152+(l*28|0)+20>>2]|0;a=Pb(o|a,I|b&-1040385)|0;f[d>>2]=(f[d>>2]|0)+1;b=I}}h=Rc(a|0,b|0,45)|0;i=h&127;a:do if(!(Ia(i)|0)){if((c|0)>0){e=0;do{a=Pb(a,b)|0;b=I;e=e+1|0}while((e|0)!=(c|0))}}else{b:do if((Nb(a,b)|0)==1){if((l|0)!=(i|0))if(La(i,f[9568+(l*28|0)>>2]|0)|0){a=Qb(a,b)|0;g=1;b=I;break}else{a=Pb(a,b)|0;g=1;b=I;break}switch(j|0){case 5:{a=Qb(a,b)|0;f[d>>2]=(f[d>>2]|0)+5;g=0;b=I;break b}case 3:{a=Pb(a,b)|0;f[d>>2]=(f[d>>2]|0)+1;g=0;b=I;break b}default:{n=0;o=0;I=n;return o|0}}}else g=0;while(0);if((c|0)>0){e=0;do{a=Ob(a,b)|0;b=I;e=e+1|0}while((e|0)!=(c|0))}if((l|0)!=(i|0)){switch(h&127){case 4:case 117:break;default:{if((g|0)!=0|(Nb(a,b)|0)!=5)break a;f[d>>2]=(f[d>>2]|0)+1;break a}}switch(k&127){case 8:case 118:break a;default:{}}if((Nb(a,b)|0)!=3)f[d>>2]=(f[d>>2]|0)+1}}while(0);f[d>>2]=((f[d>>2]|0)+c|0)%6|0;n=b;o=a;I=n;return o|0}function Ba(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;var e=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0;l=u;u=u+16|0;k=l;if(!c){k=d;f[k>>2]=a;f[k+4>>2]=b;k=0;u=l;return k|0}f[k>>2]=0;a:do if(!(Ib(a,b)|0)){g=(c|0)>0;if(g){e=0;j=a;do{j=Aa(j,b,4,k)|0;b=I;if((j|0)==0&(b|0)==0){a=2;break a}e=e+1|0;if(Ib(j,b)|0){a=1;break a}}while((e|0)<(c|0));i=d;f[i>>2]=j;f[i+4>>2]=b;i=c+-1|0;if(g){h=0;g=1;e=j;a=b;while(1){e=Aa(e,a,2,k)|0;a=I;if((e|0)==0&(a|0)==0){a=2;break a}m=d+(g<<3)|0;f[m>>2]=e;f[m+4>>2]=a;g=g+1|0;if(Ib(e,a)|0){a=1;break a}h=h+1|0;if((h|0)>=(c|0)){h=0;break}}while(1){e=Aa(e,a,3,k)|0;a=I;if((e|0)==0&(a|0)==0){a=2;break a}m=d+(g<<3)|0;f[m>>2]=e;f[m+4>>2]=a;g=g+1|0;if(Ib(e,a)|0){a=1;break a}h=h+1|0;if((h|0)>=(c|0)){h=0;break}}while(1){e=Aa(e,a,1,k)|0;a=I;if((e|0)==0&(a|0)==0){a=2;break a}m=d+(g<<3)|0;f[m>>2]=e;f[m+4>>2]=a;g=g+1|0;if(Ib(e,a)|0){a=1;break a}h=h+1|0;if((h|0)>=(c|0)){h=0;break}}while(1){e=Aa(e,a,5,k)|0;a=I;if((e|0)==0&(a|0)==0){a=2;break a}m=d+(g<<3)|0;f[m>>2]=e;f[m+4>>2]=a;g=g+1|0;if(Ib(e,a)|0){a=1;break a}h=h+1|0;if((h|0)>=(c|0)){h=0;break}}while(1){e=Aa(e,a,4,k)|0;a=I;if((e|0)==0&(a|0)==0){a=2;break a}m=d+(g<<3)|0;f[m>>2]=e;f[m+4>>2]=a;g=g+1|0;if(Ib(e,a)|0){a=1;break a}h=h+1|0;if((h|0)>=(c|0)){h=0;break}}while(1){e=Aa(e,a,6,k)|0;a=I;if((e|0)==0&(a|0)==0){a=2;break a}if((h|0)!=(i|0)){m=d+(g<<3)|0;f[m>>2]=e;f[m+4>>2]=a;if(!(Ib(e,a)|0))g=g+1|0;else{a=1;break a}}h=h+1|0;if((h|0)>=(c|0)){h=j;g=b;break}}}else{h=j;e=j;g=b;a=b}}else{h=d;f[h>>2]=a;f[h+4>>2]=b;h=a;e=a;g=b;a=b}a=((h|0)!=(e|0)|(g|0)!=(a|0))&1}else a=1;while(0);m=a;u=l;return m|0}function Ca(a,b){a=a|0;b=b|0;var c=0,d=0;c=u;u=u+32|0;d=c;Ma(a,d);a=Ra(d,b)|0;if((a|0)<=0){d=1;u=c;return d|0}d=Lc(a+-1|0,0,a+-2|0,0)|0;d=Rc(d|0,I&1|0,1)|0;d=(a*12|0)+-5+(d*6|0)|0;u=c;return d|0}function Da(a,b,c){a=a|0;b=b|0;c=c|0;var d=0.0,e=0.0,g=0.0,h=0.0,i=0.0,j=0.0,k=0,l=0.0,m=0,n=0;if(!(Qa(b,c)|0)){k=0;return k|0}b=Oa(b)|0;l=+p[c>>3];d=+p[c+8>>3];d=b&d<0.0?d+6.283185307179586:d;k=f[a>>2]|0;a=a+4|0;if(b){b=0;c=0;a:while(1){do{do{if((c|0)>=(k|0))break a;n=f[a>>2]|0;h=+p[n+(c<<4)>>3];e=+p[n+(c<<4)+8>>3];c=c+1|0;m=(c|0)==(k|0)?0:c;g=+p[n+(m<<4)>>3];i=+p[n+(m<<4)+8>>3];if(h>g){j=h;h=i}else{j=g;g=h;h=e;e=i}}while(l<g|l>j);i=h<0.0?h+6.283185307179586:h;h=e<0.0?e+6.283185307179586:e;d=i==d|h==d?d+-2.220446049250313e-16:d;j=i+(l-g)/(j-g)*(h-i)}while(!((j<0.0?j+6.283185307179586:j)>d));b=b^1}return b|0}else{b=0;c=0;b:while(1){do{do{if((c|0)>=(k|0))break b;m=f[a>>2]|0;h=+p[m+(c<<4)>>3];e=+p[m+(c<<4)+8>>3];c=c+1|0;n=(c|0)==(k|0)?0:c;g=+p[m+(n<<4)>>3];i=+p[m+(n<<4)+8>>3];if(h>g){j=h;h=i}else{j=g;g=h;h=e;e=i}}while(l<g|l>j);d=h==d|e==d?d+-2.220446049250313e-16:d}while(!(h+(l-g)/(j-g)*(e-h)>d));b=b^1}return b|0}return 0}function Ea(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,q=0.0;o=u;u=u+32|0;e=o+16|0;k=o;l=a+8|0;d=f[l>>2]|0;if((d|0)<=-1)ea(21071,21057,735,21102);m=u;u=u+((1*(d+1<<5)|0)+15&-16)|0;Uc(m|0,0,(d<<5)+32|0)|0;Na(a,m);d=Ra(m,b)|0;if((d|0)>0){j=Lc(d+-1|0,0,d+-2|0,0)|0;j=Rc(j|0,I&1|0,1)|0;j=(d*12|0)+-5+(j*6|0)|0}else j=1;Pa(m,e);i=Tb(e,b)|0;wa(i,I,d,c);if((j|0)<=0){u=o;return}g=k+8|0;h=a+12|0;e=0;do{i=c+(e<<3)|0;b=i;d=f[b>>2]|0;b=f[b+4>>2]|0;if(!((d|0)==0&(b|0)==0)){Wb(d,b,k);q=+tb(+p[k>>3]);p[k>>3]=q;q=+ub(+p[g>>3]);p[g>>3]=q;a:do if(Da(a,m,k)|0){if((f[l>>2]|0)>0){d=0;do{b=d;d=d+1|0;if(Da((f[h>>2]|0)+(b<<3)|0,m+(d<<5)|0,k)|0){n=13;break a}}while((d|0)<(f[l>>2]|0))}}else n=13;while(0);if((n|0)==13){n=0;f[i>>2]=0;f[i+4>>2]=0}}e=e+1|0}while((e|0)!=(j|0));u=o;return}function Fa(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0,g=0,h=0,i=0,j=0,k=0;k=u;u=u+176|0;j=k;if((b|0)<1){uc(c,0,0);u=k;return}h=a;h=Rc(f[h>>2]|0,f[h+4>>2]|0,52)|0;uc(c,(b|0)>6?b:6,h&15);h=0;do{d=a+(h<<3)|0;Xb(f[d>>2]|0,f[d+4>>2]|0,j);d=f[j>>2]|0;if((d|0)>0){i=0;do{g=j+8+(i<<4)|0;i=i+1|0;d=j+8+(((i|0)%(d|0)|0)<<4)|0;e=zc(c,d,g)|0;if(!e)yc(c,g,d)|0;else xc(c,e)|0;d=f[j>>2]|0}while((i|0)<(d|0))}h=h+1|0}while((h|0)!=(b|0));u=k;return}function Ga(a,b){a=a|0;b=b|0;var c=0,d=0,e=0,g=0,h=0;g=u;u=u+16|0;e=g;ec(b);c=wc(a)|0;if(!c){u=g;return}do{d=fc(b)|0;do{gc(d,c)|0;h=c+16|0;f[e>>2]=f[h>>2];f[e+4>>2]=f[h+4>>2];f[e+8>>2]=f[h+8>>2];f[e+12>>2]=f[h+12>>2];xc(a,c)|0;c=Ac(a,e)|0}while((c|0)!=0);c=wc(a)|0}while((c|0)!=0);u=g;return}function Ha(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0;d=u;u=u+16|0;e=d;Fa(a,b,e);Ga(e,c);vc(e);u=d;return}function Ia(a){a=a|0;return f[9568+(a*28|0)+16>>2]|0}function Ja(a){a=a|0;return f[12984+((f[a>>2]|0)*216|0)+((f[a+4>>2]|0)*72|0)+((f[a+8>>2]|0)*24|0)+(f[a+12>>2]<<3)>>2]|0}function Ka(a){a=a|0;return f[12984+((f[a>>2]|0)*216|0)+((f[a+4>>2]|0)*72|0)+((f[a+8>>2]|0)*24|0)+(f[a+12>>2]<<3)+4>>2]|0}function La(a,b){a=a|0;b=b|0;if((f[9568+(a*28|0)+20>>2]|0)==(b|0)){b=1;return b|0}b=(f[9568+(a*28|0)+24>>2]|0)==(b|0);return b|0}function Ma(a,b){a=a|0;b=b|0;var c=0.0,d=0.0,e=0.0,g=0.0,h=0.0,i=0,j=0.0,k=0,l=0,m=0,n=0,o=0,q=0;o=f[a+4>>2]|0;k=f[a>>2]|0;if(!k){f[b>>2]=0;f[b+4>>2]=0;f[b+8>>2]=0;f[b+12>>2]=0;f[b+16>>2]=0;f[b+20>>2]=0;f[b+24>>2]=0;f[b+28>>2]=0;return}l=b+8|0;p[l>>3]=1797693134862315708145274.0e284;m=b+24|0;p[m>>3]=1797693134862315708145274.0e284;p[b>>3]=-1797693134862315708145274.0e284;n=b+16|0;p[n>>3]=-1797693134862315708145274.0e284;if((k|0)>0){a=0;i=0;e=1797693134862315708145274.0e284;g=1797693134862315708145274.0e284;h=-1797693134862315708145274.0e284;d=-1797693134862315708145274.0e284}else return;while(1){c=+p[o+(i<<4)>>3];j=+p[o+(i<<4)+8>>3];if(c<e){p[l>>3]=c;e=c}if(j<g){p[m>>3]=j;g=j}if(c>h)p[b>>3]=c;else c=h;if(j>d){p[n>>3]=j;d=j}i=i+1|0;q=(i|0)==(k|0);a=a|+K(+(j-+p[o+((q?0:i)<<4)+8>>3]))>3.141592653589793;if(q)break;else h=c}if(!a)return;p[n>>3]=g;p[m>>3]=d;return}function Na(a,b){a=a|0;b=b|0;var c=0,d=0.0,e=0.0,g=0.0,h=0.0,i=0.0,j=0,k=0.0,l=0,m=0,n=0,o=0,q=0,r=0,s=0,t=0,u=0,v=0;l=f[a+4>>2]|0;m=f[a>>2]|0;if(m){n=b+8|0;p[n>>3]=1797693134862315708145274.0e284;o=b+24|0;p[o>>3]=1797693134862315708145274.0e284;p[b>>3]=-1797693134862315708145274.0e284;q=b+16|0;p[q>>3]=-1797693134862315708145274.0e284;if((m|0)>0){c=0;j=0;g=1797693134862315708145274.0e284;h=1797693134862315708145274.0e284;i=-1797693134862315708145274.0e284;e=-1797693134862315708145274.0e284;while(1){d=+p[l+(j<<4)>>3];k=+p[l+(j<<4)+8>>3];if(d<g){p[n>>3]=d;g=d}if(k<h){p[o>>3]=k;h=k}if(d>i)p[b>>3]=d;else d=i;if(k>e){p[q>>3]=k;e=k}j=j+1|0;u=(j|0)==(m|0);c=c|+K(+(k-+p[l+((u?0:j)<<4)+8>>3]))>3.141592653589793;if(u)break;else i=d}if(c){p[q>>3]=h;p[o>>3]=e}}}else{f[b>>2]=0;f[b+4>>2]=0;f[b+8>>2]=0;f[b+12>>2]=0;f[b+16>>2]=0;f[b+20>>2]=0;f[b+24>>2]=0;f[b+28>>2]=0}u=a+8|0;c=f[u>>2]|0;if((c|0)<=0)return;t=a+12|0;s=0;do{r=f[t>>2]|0;o=s;s=s+1|0;m=b+(s<<5)|0;n=f[r+(o<<3)+4>>2]|0;o=f[r+(o<<3)>>2]|0;if(o){q=b+(s<<5)+8|0;p[q>>3]=1797693134862315708145274.0e284;a=b+(s<<5)+24|0;p[a>>3]=1797693134862315708145274.0e284;p[m>>3]=-1797693134862315708145274.0e284;r=b+(s<<5)+16|0;p[r>>3]=-1797693134862315708145274.0e284;if((o|0)>0){j=0;l=0;g=1797693134862315708145274.0e284;h=1797693134862315708145274.0e284;i=-1797693134862315708145274.0e284;e=-1797693134862315708145274.0e284;while(1){d=+p[n+(l<<4)>>3];k=+p[n+(l<<4)+8>>3];if(d<g){p[q>>3]=d;g=d}if(k<h){p[a>>3]=k;h=k}if(d>i)p[m>>3]=d;else d=i;if(k>e){p[r>>3]=k;e=k}l=l+1|0;v=(l|0)==(o|0);j=j|+K(+(k-+p[n+((v?0:l)<<4)+8>>3]))>3.141592653589793;if(v)break;else i=d}if(j){p[r>>3]=h;p[a>>3]=e}}}else{f[m>>2]=0;f[m+4>>2]=0;f[m+8>>2]=0;f[m+12>>2]=0;f[m+16>>2]=0;f[m+20>>2]=0;f[m+24>>2]=0;f[m+28>>2]=0;c=f[u>>2]|0}}while((s|0)<(c|0));return}function Oa(a){a=a|0;return +p[a+16>>3]<+p[a+24>>3]|0}function Pa(a,b){a=a|0;b=b|0;var c=0.0,d=0.0;p[b>>3]=(+p[a>>3]+ +p[a+8>>3])*.5;c=+p[a+16>>3];d=+p[a+24>>3];c=+ub((d+(c<d?c+6.283185307179586:c))*.5);p[b+8>>3]=c;return}function Qa(a,b){a=a|0;b=b|0;var c=0.0,d=0.0,e=0.0;c=+p[b>>3];do if(c>=+p[a+8>>3]?c<=+p[a>>3]:0){d=+p[a+16>>3];c=+p[a+24>>3];e=+p[b+8>>3];b=e>=c;a=e<=d;if(d<c){if(b){a=1;break}break}else{if(!b){a=0;break}break}}else a=0;while(0);return a|0}function Ra(a,b){a=a|0;b=b|0;var c=0,d=0,e=0,f=0.0,g=0,h=0,i=0,j=0.0,k=0.0,l=0;c=u;u=u+224|0;e=c+200|0;d=c+32|0;g=c+16|0;h=c;l=a+8|0;p[g>>3]=(+p[a>>3]+ +p[l>>3])*.5;i=a+16|0;f=+p[i>>3];k=+p[a+24>>3];f=+ub((k+(f<k?f+6.283185307179586:f))*.5);p[g+8>>3]=f;f=+p[a>>3];k=+K(+f);j=+p[l>>3];a=k>+K(+j);p[h>>3]=a?j:f;p[h+8>>3]=+p[i>>3];f=+vb(g,h);a=Tb(g,b)|0;b=I;Wb(a,b,e);Xb(a,b,d);b=~~+W(+(f/(+vb(e,d+8|0)*1.5)));u=c;return b|0}function Sa(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;f[a>>2]=b;f[a+4>>2]=c;f[a+8>>2]=d;return}function Ta(a,b){a=a|0;b=b|0;var c=0.0,d=0,e=0,g=0,h=0.0,i=0,j=0.0,k=0.0,l=0,m=0,n=0.0;m=b+8|0;f[m>>2]=0;j=+p[a>>3];c=+K(+j);k=+p[a+8>>3];h=+K(+k)/.8660254037844386;c=c+h*.5;d=~~c;a=~~h;c=c-+(d|0);h=h-+(a|0);do if(c<.5)if(c<.3333333333333333){f[b>>2]=d;a=(!(h<(c+1.0)*.5)&1)+a|0;f[b+4>>2]=a;break}else{n=1.0-c;a=(!(h<n)&1)+a|0;f[b+4>>2]=a;d=(n<=h&h<c*2.0&1)+d|0;f[b>>2]=d;break}else if(c<.6666666666666666){l=!(h<1.0-c);a=(l&1)+a|0;f[b+4>>2]=a;d=((l|!(c*2.0+-1.0<h))&1)+d|0;f[b>>2]=d;break}else{d=d+1|0;f[b>>2]=d;a=(!(h<c*.5)&1)+a|0;f[b+4>>2]=a;break}while(0);if(j<0.0){if(!(a&1)){l=(a|0)/2|0;l=Nc(d|0,((d|0)<0)<<31>>31|0,l|0,((l|0)<0)<<31>>31|0)|0;c=+(d|0)-(+(l>>>0)+4294967296.0*+(I|0))*2.0}else{l=(a+1|0)/2|0;l=Nc(d|0,((d|0)<0)<<31>>31|0,l|0,((l|0)<0)<<31>>31|0)|0;c=+(d|0)-((+(l>>>0)+4294967296.0*+(I|0))*2.0+1.0)}d=~~c;f[b>>2]=d}l=b+4|0;if(k<0.0){d=d-((a<<1|1|0)/2|0)|0;f[b>>2]=d;a=0-a|0;f[l>>2]=a}if((d|0)<0){a=a-d|0;f[l>>2]=a;g=0-d|0;f[m>>2]=g;f[b>>2]=0;d=0}else g=0;if((a|0)<0){d=d-a|0;f[b>>2]=d;g=g-a|0;f[m>>2]=g;f[l>>2]=0;a=0}i=d-g|0;e=a-g|0;if((g|0)<0){f[b>>2]=i;f[l>>2]=e;f[m>>2]=0;a=e;d=i;g=0}e=(a|0)<(d|0)?a:d;e=(g|0)<(e|0)?g:e;if((e|0)<=0)return;f[b>>2]=d-e;f[l>>2]=a-e;f[m>>2]=g-e;return}function Ua(a){a=a|0;var b=0,c=0,d=0,e=0,g=0,h=0;c=f[a>>2]|0;h=a+4|0;b=f[h>>2]|0;if((c|0)<0){b=b-c|0;f[h>>2]=b;g=a+8|0;f[g>>2]=(f[g>>2]|0)-c;f[a>>2]=0;c=0}if((b|0)<0){c=c-b|0;f[a>>2]=c;g=a+8|0;e=(f[g>>2]|0)-b|0;f[g>>2]=e;f[h>>2]=0;b=0}else{e=a+8|0;g=e;e=f[e>>2]|0}if((e|0)<0){c=c-e|0;f[a>>2]=c;b=b-e|0;f[h>>2]=b;f[g>>2]=0;e=0}d=(b|0)<(c|0)?b:c;d=(e|0)<(d|0)?e:d;if((d|0)<=0)return;f[a>>2]=c-d;f[h>>2]=b-d;f[g>>2]=e-d;return}function Va(a,b){a=a|0;b=b|0;var c=0.0,d=0;d=f[a+8>>2]|0;c=+((f[a+4>>2]|0)-d|0);p[b>>3]=+((f[a>>2]|0)-d|0)-c*.5;p[b+8>>3]=c*.8660254037844386;return}function Wa(a,b,c){a=a|0;b=b|0;c=c|0;f[c>>2]=(f[b>>2]|0)+(f[a>>2]|0);f[c+4>>2]=(f[b+4>>2]|0)+(f[a+4>>2]|0);f[c+8>>2]=(f[b+8>>2]|0)+(f[a+8>>2]|0);return}function Xa(a,b,c){a=a|0;b=b|0;c=c|0;f[c>>2]=(f[a>>2]|0)-(f[b>>2]|0);f[c+4>>2]=(f[a+4>>2]|0)-(f[b+4>>2]|0);f[c+8>>2]=(f[a+8>>2]|0)-(f[b+8>>2]|0);return}function Ya(a,b){a=a|0;b=b|0;var c=0,d=0;c=X(f[a>>2]|0,b)|0;f[a>>2]=c;c=a+4|0;d=X(f[c>>2]|0,b)|0;f[c>>2]=d;a=a+8|0;b=X(f[a>>2]|0,b)|0;f[a>>2]=b;return}function Za(a){a=a|0;var b=0,c=0,d=0,e=0,g=0,h=0,i=0;h=f[a>>2]|0;i=(h|0)<0;d=(f[a+4>>2]|0)-(i?h:0)|0;g=(d|0)<0;e=(g?0-d|0:0)+((f[a+8>>2]|0)-(i?h:0))|0;c=(e|0)<0;a=c?0:e;b=(g?0:d)-(c?e:0)|0;e=(i?0:h)-(g?d:0)-(c?e:0)|0;c=(b|0)<(e|0)?b:e;c=(a|0)<(c|0)?a:c;d=(c|0)>0;a=a-(d?c:0)|0;b=b-(d?c:0)|0;a:do switch(e-(d?c:0)|0){case 0:switch(b|0){case 0:{i=(a|0)==0?0:(a|0)==1?1:-1;return i|0}case 1:{i=(a|0)==0?2:(a|0)==1?3:-1;return i|0}default:break a}case 1:switch(b|0){case 0:{i=(a|0)==0?4:(a|0)==1?5:-1;return i|0}case 1:{if(!a)a=6;else break a;return a|0}default:break a}default:{}}while(0);i=-1;return i|0}function _a(a){a=a|0;var b=0,c=0,d=0,e=0,g=0,h=0,i=0;h=a+8|0;g=f[h>>2]|0;b=(f[a>>2]|0)-g|0;i=a+4|0;g=(f[i>>2]|0)-g|0;c=Hc(+((b*3|0)-g|0)/7.0)|0;f[a>>2]=c;b=Hc(+((g<<1)+b|0)/7.0)|0;f[i>>2]=b;f[h>>2]=0;if((c|0)<0){b=b-c|0;f[i>>2]=b;d=0-c|0;f[h>>2]=d;f[a>>2]=0;c=0}else d=0;if((b|0)<0){c=c-b|0;f[a>>2]=c;d=d-b|0;f[h>>2]=d;f[i>>2]=0;b=0}g=c-d|0;e=b-d|0;if((d|0)<0){f[a>>2]=g;f[i>>2]=e;f[h>>2]=0;b=e;c=g;d=0}e=(b|0)<(c|0)?b:c;e=(d|0)<(e|0)?d:e;if((e|0)<=0)return;f[a>>2]=c-e;f[i>>2]=b-e;f[h>>2]=d-e;return}function $a(a){a=a|0;var b=0,c=0,d=0,e=0,g=0,h=0,i=0;h=a+8|0;g=f[h>>2]|0;b=(f[a>>2]|0)-g|0;i=a+4|0;g=(f[i>>2]|0)-g|0;c=Hc(+((b<<1)+g|0)/7.0)|0;f[a>>2]=c;b=Hc(+((g*3|0)-b|0)/7.0)|0;f[i>>2]=b;f[h>>2]=0;if((c|0)<0){b=b-c|0;f[i>>2]=b;d=0-c|0;f[h>>2]=d;f[a>>2]=0;c=0}else d=0;if((b|0)<0){c=c-b|0;f[a>>2]=c;d=d-b|0;f[h>>2]=d;f[i>>2]=0;b=0}g=c-d|0;e=b-d|0;if((d|0)<0){f[a>>2]=g;f[i>>2]=e;f[h>>2]=0;b=e;c=g;d=0}e=(b|0)<(c|0)?b:c;e=(d|0)<(e|0)?d:e;if((e|0)<=0)return;f[a>>2]=c-e;f[i>>2]=b-e;f[h>>2]=d-e;return}function ab(a){a=a|0;var b=0,c=0,d=0,e=0,g=0,h=0,i=0;c=f[a>>2]|0;h=a+4|0;b=f[h>>2]|0;i=a+8|0;g=f[i>>2]|0;d=b+(c*3|0)|0;f[a>>2]=d;b=g+(b*3|0)|0;f[h>>2]=b;c=(g*3|0)+c|0;f[i>>2]=c;if((d|0)<0){b=b-d|0;f[h>>2]=b;c=c-d|0;f[i>>2]=c;f[a>>2]=0;d=0}if((b|0)<0){d=d-b|0;f[a>>2]=d;c=c-b|0;f[i>>2]=c;f[h>>2]=0;b=0}g=d-c|0;e=b-c|0;if((c|0)<0){f[a>>2]=g;f[h>>2]=e;f[i>>2]=0;b=e;e=g;c=0}else e=d;d=(b|0)<(e|0)?b:e;d=(c|0)<(d|0)?c:d;if((d|0)<=0)return;f[a>>2]=e-d;f[h>>2]=b-d;f[i>>2]=c-d;return}function bb(a){a=a|0;var b=0,c=0,d=0,e=0,g=0,h=0,i=0;d=f[a>>2]|0;h=a+4|0;b=f[h>>2]|0;i=a+8|0;g=f[i>>2]|0;c=(b*3|0)+d|0;f[h>>2]=c;d=g+(d*3|0)|0;f[a>>2]=d;b=(g*3|0)+b|0;f[i>>2]=b;if((d|0)<0){c=c-d|0;f[h>>2]=c;b=b-d|0;f[i>>2]=b;f[a>>2]=0;d=0}if((c|0)<0){d=d-c|0;f[a>>2]=d;b=b-c|0;f[i>>2]=b;f[h>>2]=0;c=0}g=d-b|0;e=c-b|0;if((b|0)<0){f[a>>2]=g;f[h>>2]=e;f[i>>2]=0;c=e;e=g;b=0}else e=d;d=(c|0)<(e|0)?c:e;d=(b|0)<(d|0)?b:d;if((d|0)<=0)return;f[a>>2]=e-d;f[h>>2]=c-d;f[i>>2]=b-d;return}function cb(a,b){a=a|0;b=b|0;var c=0,d=0,e=0,g=0,h=0,i=0;if(!b)return;d=(f[17304+(b*12|0)>>2]|0)+(f[a>>2]|0)|0;f[a>>2]=d;i=a+4|0;c=(f[17304+(b*12|0)+4>>2]|0)+(f[i>>2]|0)|0;f[i>>2]=c;h=a+8|0;b=(f[17304+(b*12|0)+8>>2]|0)+(f[h>>2]|0)|0;f[h>>2]=b;if((d|0)<0){c=c-d|0;f[i>>2]=c;b=b-d|0;f[h>>2]=b;f[a>>2]=0;d=0}if((c|0)<0){d=d-c|0;f[a>>2]=d;b=b-c|0;f[h>>2]=b;f[i>>2]=0;c=0}g=d-b|0;e=c-b|0;if((b|0)<0){f[a>>2]=g;f[i>>2]=e;f[h>>2]=0;d=g;b=0}else e=c;c=(e|0)<(d|0)?e:d;c=(b|0)<(c|0)?b:c;if((c|0)<=0)return;f[a>>2]=d-c;f[i>>2]=e-c;f[h>>2]=b-c;return}function db(a){a=a|0;var b=0,c=0,d=0,e=0,g=0,h=0,i=0;d=f[a>>2]|0;h=a+4|0;b=f[h>>2]|0;i=a+8|0;g=f[i>>2]|0;c=b+d|0;f[h>>2]=c;d=d+g|0;f[a>>2]=d;b=g+b|0;f[i>>2]=b;if((d|0)<0){c=c-d|0;f[h>>2]=c;b=b-d|0;f[i>>2]=b;f[a>>2]=0;d=0}if((c|0)<0){d=d-c|0;f[a>>2]=d;b=b-c|0;f[i>>2]=b;f[h>>2]=0;c=0}g=d-b|0;e=c-b|0;if((b|0)<0){f[a>>2]=g;f[h>>2]=e;f[i>>2]=0;c=e;e=g;b=0}else e=d;d=(c|0)<(e|0)?c:e;d=(b|0)<(d|0)?b:d;if((d|0)<=0)return;f[a>>2]=e-d;f[h>>2]=c-d;f[i>>2]=b-d;return}function eb(a){a=a|0;var b=0,c=0,d=0,e=0,g=0,h=0,i=0;b=f[a>>2]|0;h=a+4|0;c=f[h>>2]|0;i=a+8|0;g=f[i>>2]|0;d=c+b|0;f[a>>2]=d;c=g+c|0;f[h>>2]=c;b=g+b|0;f[i>>2]=b;if((d|0)<0){c=c-d|0;f[h>>2]=c;b=b-d|0;f[i>>2]=b;f[a>>2]=0;d=0}if((c|0)<0){d=d-c|0;f[a>>2]=d;b=b-c|0;f[i>>2]=b;f[h>>2]=0;c=0}g=d-b|0;e=c-b|0;if((b|0)<0){f[a>>2]=g;f[h>>2]=e;f[i>>2]=0;c=e;e=g;b=0}else e=d;d=(c|0)<(e|0)?c:e;d=(b|0)<(d|0)?b:d;if((d|0)<=0)return;f[a>>2]=e-d;f[h>>2]=c-d;f[i>>2]=b-d;return}function fb(a){a=a|0;switch(a|0){case 1:{a=5;break}case 5:{a=4;break}case 4:{a=6;break}case 6:{a=2;break}case 2:{a=3;break}case 3:{a=1;break}default:{}}return a|0}function gb(a){a=a|0;switch(a|0){case 1:{a=3;break}case 3:{a=2;break}case 2:{a=6;break}case 6:{a=4;break}case 4:{a=5;break}case 5:{a=1;break}default:{}}return a|0}function hb(a){a=a|0;var b=0,c=0,d=0,e=0,g=0,h=0,i=0;c=f[a>>2]|0;h=a+4|0;b=f[h>>2]|0;i=a+8|0;g=f[i>>2]|0;d=b+(c<<1)|0;f[a>>2]=d;b=g+(b<<1)|0;f[h>>2]=b;c=(g<<1)+c|0;f[i>>2]=c;if((d|0)<0){b=b-d|0;f[h>>2]=b;c=c-d|0;f[i>>2]=c;f[a>>2]=0;d=0}if((b|0)<0){d=d-b|0;f[a>>2]=d;c=c-b|0;f[i>>2]=c;f[h>>2]=0;b=0}g=d-c|0;e=b-c|0;if((c|0)<0){f[a>>2]=g;f[h>>2]=e;f[i>>2]=0;b=e;e=g;c=0}else e=d;d=(b|0)<(e|0)?b:e;d=(c|0)<(d|0)?c:d;if((d|0)<=0)return;f[a>>2]=e-d;f[h>>2]=b-d;f[i>>2]=c-d;return}function ib(a){a=a|0;var b=0,c=0,d=0,e=0,g=0,h=0,i=0;d=f[a>>2]|0;h=a+4|0;b=f[h>>2]|0;i=a+8|0;g=f[i>>2]|0;c=(b<<1)+d|0;f[h>>2]=c;d=g+(d<<1)|0;f[a>>2]=d;b=(g<<1)+b|0;f[i>>2]=b;if((d|0)<0){c=c-d|0;f[h>>2]=c;b=b-d|0;f[i>>2]=b;f[a>>2]=0;d=0}if((c|0)<0){d=d-c|0;f[a>>2]=d;b=b-c|0;f[i>>2]=b;f[h>>2]=0;c=0}g=d-b|0;e=c-b|0;if((b|0)<0){f[a>>2]=g;f[h>>2]=e;f[i>>2]=0;c=e;e=g;b=0}else e=d;d=(c|0)<(e|0)?c:e;d=(b|0)<(d|0)?b:d;if((d|0)<=0)return;f[a>>2]=e-d;f[h>>2]=c-d;f[i>>2]=b-d;return}function jb(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0;d=u;u=u+16|0;e=d;kb(a,b,c,e);Ta(e,c+4|0);u=d;return}function kb(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;var e=0.0,g=0,h=0.0,i=0.0,j=0;j=u;u=u+32|0;g=j;tc(a,g);f[c>>2]=0;e=+sc(328,g);h=+sc(352,g);if(h<e){f[c>>2]=1;e=h}h=+sc(376,g);if(h<e){f[c>>2]=2;e=h}h=+sc(400,g);if(h<e){f[c>>2]=3;e=h}h=+sc(424,g);if(h<e){f[c>>2]=4;e=h}h=+sc(448,g);if(h<e){f[c>>2]=5;e=h}h=+sc(472,g);if(h<e){f[c>>2]=6;e=h}h=+sc(496,g);if(h<e){f[c>>2]=7;e=h}h=+sc(520,g);if(h<e){f[c>>2]=8;e=h}h=+sc(544,g);if(h<e){f[c>>2]=9;e=h}h=+sc(568,g);if(h<e){f[c>>2]=10;e=h}h=+sc(592,g);if(h<e){f[c>>2]=11;e=h}h=+sc(616,g);if(h<e){f[c>>2]=12;e=h}h=+sc(640,g);if(h<e){f[c>>2]=13;e=h}h=+sc(664,g);if(h<e){f[c>>2]=14;e=h}h=+sc(688,g);if(h<e){f[c>>2]=15;e=h}h=+sc(712,g);if(h<e){f[c>>2]=16;e=h}h=+sc(736,g);if(h<e){f[c>>2]=17;e=h}h=+sc(760,g);if(h<e){f[c>>2]=18;e=h}h=+sc(784,g);if(h<e){f[c>>2]=19;e=h}h=+Q(+(1.0-e*.5));if(h<1.0e-16){f[d>>2]=0;f[d+4>>2]=0;f[d+8>>2]=0;f[d+12>>2]=0;u=j;return}c=f[c>>2]|0;e=+p[808+(c*24|0)>>3];e=+qb(e-+qb(+wb(8+(c<<4)|0,a)));if(!(Sb(b)|0))i=e;else i=+qb(e+-.3334731722518321);e=+P(+h)/.381966011250105;if((b|0)>0){g=0;do{e=e*2.6457513110645907;g=g+1|0}while((g|0)!=(b|0))}h=e*+N(+i);p[d>>3]=h;i=e*+O(+i);p[d+8>>3]=i;u=j;return}function lb(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;var g=0.0,h=0.0;g=+pc(a);if(g<1.0e-16){b=8+(b<<4)|0;f[e>>2]=f[b>>2];f[e+4>>2]=f[b+4>>2];f[e+8>>2]=f[b+8>>2];f[e+12>>2]=f[b+12>>2];return}h=+T(+(+p[a+8>>3]),+(+p[a>>3]));if((c|0)>0){a=0;do{g=g/2.6457513110645907;a=a+1|0}while((a|0)!=(c|0))}if(!d){g=+S(+(g*.381966011250105));if(Sb(c)|0)h=+qb(h+.3334731722518321)}else{g=g/3.0;c=(Sb(c)|0)==0;g=+S(+((c?g:g/2.6457513110645907)*.381966011250105))}xb(8+(b<<4)|0,+qb(+p[808+(b*24|0)>>3]-h),g,e);return}function mb(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0;d=u;u=u+16|0;e=d;Va(a+4|0,e);lb(e,f[a>>2]|0,b,0,c);u=d;return}function nb(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,q=0,r=0,s=0,t=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0.0,G=0.0;E=u;u=u+384|0;d=E+316|0;e=E+256|0;j=E+240|0;A=E+160|0;B=E+144|0;C=E+128|0;D=E+96|0;s=E+80|0;t=E+112|0;v=E+64|0;w=E+48|0;x=E+32|0;y=E+16|0;z=E;g=d;h=17388;i=g+60|0;do{f[g>>2]=f[h>>2];g=g+4|0;h=h+4|0}while((g|0)<(i|0));g=e;h=17448;i=g+60|0;do{f[g>>2]=f[h>>2];g=g+4|0;h=h+4|0}while((g|0)<(i|0));r=(Sb(b)|0)==0;e=r?d:e;f[j>>2]=f[a>>2];f[j+4>>2]=f[a+4>>2];f[j+8>>2]=f[a+8>>2];f[j+12>>2]=f[a+12>>2];d=j+4|0;hb(d);ib(d);if(!(Sb(b)|0))r=b;else{bb(d);r=b+1|0}f[A>>2]=f[j>>2];a=A+4|0;Wa(d,e,a);Ua(a);f[A+16>>2]=f[j>>2];a=A+20|0;Wa(d,e+12|0,a);Ua(a);f[A+32>>2]=f[j>>2];a=A+36|0;Wa(d,e+24|0,a);Ua(a);f[A+48>>2]=f[j>>2];a=A+52|0;Wa(d,e+36|0,a);Ua(a);f[A+64>>2]=f[j>>2];a=A+68|0;Wa(d,e+48|0,a);Ua(a);f[c>>2]=0;a=B+4|0;j=D+4|0;k=17508+(r<<2)|0;l=17576+(r<<2)|0;m=w+8|0;n=x+8|0;o=y+8|0;q=C+4|0;i=0;a:while(1){h=A+(((i|0)%5|0)<<4)|0;f[C>>2]=f[h>>2];f[C+4>>2]=f[h+4>>2];f[C+8>>2]=f[h+8>>2];f[C+12>>2]=f[h+12>>2];if((ob(C,r,0,1)|0)==2)do{}while((ob(C,r,0,1)|0)==2);if((i|0)>0&(Sb(b)|0)!=0){f[D>>2]=f[C>>2];f[D+4>>2]=f[C+4>>2];f[D+8>>2]=f[C+8>>2];f[D+12>>2]=f[C+12>>2];Va(a,s);e=f[D>>2]|0;g=f[17644+(e*80|0)+(f[B>>2]<<2)>>2]|0;f[D>>2]=f[19244+(e*80|0)+(g*20|0)>>2];h=f[19244+(e*80|0)+(g*20|0)+16>>2]|0;if((h|0)>0){d=0;do{db(j);d=d+1|0}while((d|0)<(h|0))}h=19244+(e*80|0)+(g*20|0)+4|0;f[t>>2]=f[h>>2];f[t+4>>2]=f[h+4>>2];f[t+8>>2]=f[h+8>>2];Ya(t,(f[k>>2]|0)*3|0);Wa(j,t,j);Ua(j);Va(j,v);F=+(f[l>>2]|0);p[w>>3]=F*3.0;p[m>>3]=0.0;G=F*-1.5;p[x>>3]=G;p[n>>3]=F*2.598076211353316;p[y>>3]=G;p[o>>3]=F*-2.598076211353316;switch(f[17644+((f[D>>2]|0)*80|0)+(f[C>>2]<<2)>>2]|0){case 1:{d=x;e=w;break}case 3:{d=y;e=x;break}case 2:{d=w;e=y;break}default:{d=12;break a}}qc(s,v,e,d,z);lb(z,f[D>>2]|0,r,1,c+8+(f[c>>2]<<4)|0);f[c>>2]=(f[c>>2]|0)+1}if((i|0)>=5){d=4;break}Va(q,D);lb(D,f[C>>2]|0,r,1,c+8+(f[c>>2]<<4)|0);f[c>>2]=(f[c>>2]|0)+1;f[B>>2]=f[C>>2];f[B+4>>2]=f[C+4>>2];f[B+8>>2]=f[C+8>>2];f[B+12>>2]=f[C+12>>2];i=i+1|0}if((d|0)==4){u=E;return}else if((d|0)==12)ea(21111,21158,630,21168)}function ob(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;var e=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0;p=u;u=u+32|0;n=p+12|0;i=p;o=a+4|0;k=f[17576+(b<<2)>>2]|0;m=(d|0)!=0;k=m?k*3|0:k;g=f[o>>2]|0;l=a+8|0;h=f[l>>2]|0;if(m){d=a+12|0;e=f[d>>2]|0;if((h+g+e|0)==(k|0)){o=1;u=p;return o|0}else{j=d;d=e}}else{d=a+12|0;j=d;d=f[d>>2]|0}if((h+g+d|0)<=(k|0)){o=0;u=p;return o|0}do if((d|0)>0){d=f[a>>2]|0;if((h|0)>0){g=19244+(d*80|0)+60|0;d=a;break}d=19244+(d*80|0)+40|0;if(!c){g=d;d=a}else{Sa(n,k,0,0);Xa(o,n,i);eb(i);Wa(i,n,o);g=d;d=a}}else{g=19244+((f[a>>2]|0)*80|0)+20|0;d=a}while(0);f[d>>2]=f[g>>2];e=g+16|0;if((f[e>>2]|0)>0){d=0;do{db(o);d=d+1|0}while((d|0)<(f[e>>2]|0))}a=g+4|0;f[n>>2]=f[a>>2];f[n+4>>2]=f[a+4>>2];f[n+8>>2]=f[a+8>>2];b=f[17508+(b<<2)>>2]|0;Ya(n,m?b*3|0:b);Wa(o,n,o);Ua(o);if(m)d=((f[l>>2]|0)+(f[o>>2]|0)+(f[j>>2]|0)|0)==(k|0)?1:2;else d=2;o=d;u=p;return o|0}function pb(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;var e=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,q=0,r=0,s=0,t=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0.0,C=0.0;A=u;u=u+368|0;h=A+296|0;i=A+224|0;v=A+208|0;w=A+112|0;x=A+96|0;y=A+80|0;o=A+64|0;q=A+48|0;r=A+32|0;s=A+16|0;t=A;if(c|0){nb(a,b,d);u=A;return}c=h;e=20844;g=c+72|0;do{f[c>>2]=f[e>>2];c=c+4|0;e=e+4|0}while((c|0)<(g|0));c=i;e=20916;g=c+72|0;do{f[c>>2]=f[e>>2];c=c+4|0;e=e+4|0}while((c|0)<(g|0));e=(Sb(b)|0)==0;e=e?h:i;f[v>>2]=f[a>>2];f[v+4>>2]=f[a+4>>2];f[v+8>>2]=f[a+8>>2];f[v+12>>2]=f[a+12>>2];c=v+4|0;hb(c);ib(c);if(!(Sb(b)|0))n=b;else{bb(c);n=b+1|0}f[w>>2]=f[v>>2];i=w+4|0;Wa(c,e,i);Ua(i);f[w+16>>2]=f[v>>2];i=w+20|0;Wa(c,e+12|0,i);Ua(i);f[w+32>>2]=f[v>>2];i=w+36|0;Wa(c,e+24|0,i);Ua(i);f[w+48>>2]=f[v>>2];i=w+52|0;Wa(c,e+36|0,i);Ua(i);f[w+64>>2]=f[v>>2];i=w+68|0;Wa(c,e+48|0,i);Ua(i);f[w+80>>2]=f[v>>2];i=w+84|0;Wa(c,e+60|0,i);Ua(i);f[d>>2]=0;i=17576+(n<<2)|0;a=q+8|0;j=r+8|0;k=s+8|0;l=x+4|0;c=-1;e=0;h=0;a:while(1){g=(h|0)%6|0;m=w+(g<<4)|0;f[x>>2]=f[m>>2];f[x+4>>2]=f[m+4>>2];f[x+8>>2]=f[m+8>>2];f[x+12>>2]=f[m+12>>2];m=ob(x,n,0,1)|0;if((h|0)>0&(Sb(b)|0)!=0?((e|0)!=1?(f[x>>2]|0)!=(c|0):0):0){Va(w+(((g+5|0)%6|0)<<4)+4|0,y);Va(w+(g<<4)+4|0,o);B=+(f[i>>2]|0);p[q>>3]=B*3.0;p[a>>3]=0.0;C=B*-1.5;p[r>>3]=C;p[j>>3]=B*2.598076211353316;p[s>>3]=C;p[k>>3]=B*-2.598076211353316;g=f[v>>2]|0;switch(f[17644+(g*80|0)+(((c|0)==(g|0)?f[x>>2]|0:c)<<2)>>2]|0){case 1:{c=r;e=q;break}case 3:{c=s;e=r;break}case 2:{c=q;e=s;break}default:{z=11;break a}}qc(y,o,e,c,t);if(!(rc(y,t)|0)?!(rc(o,t)|0):0){lb(t,f[v>>2]|0,n,1,d+8+(f[d>>2]<<4)|0);f[d>>2]=(f[d>>2]|0)+1}}if((h|0)>=6)break;Va(l,y);lb(y,f[x>>2]|0,n,1,d+8+(f[d>>2]<<4)|0);f[d>>2]=(f[d>>2]|0)+1;c=f[x>>2]|0;e=m;h=h+1|0}if((z|0)==11)ea(21194,21158,784,21239);u=A;return}function qb(a){a=+a;var b=0.0;b=a<0.0?a+6.283185307179586:a;return +(!(a>=6.283185307179586)?b:b+-6.283185307179586)}function rb(a,b,c){a=a|0;b=b|0;c=+c;if(!(+K(+(+p[a>>3]-+p[b>>3]))<c)){b=0;return b|0}b=+K(+(+p[a+8>>3]-+p[b+8>>3]))<c;return b|0}function sb(a,b){a=a|0;b=b|0;if(!(+K(+(+p[a>>3]-+p[b>>3]))<1.7453292519943298e-11)){b=0;return b|0}b=+K(+(+p[a+8>>3]-+p[b+8>>3]))<1.7453292519943298e-11;return b|0}function tb(a){a=+a;if(!(a>1.5707963267948966))return +a;do a=a+-3.141592653589793;while(a>1.5707963267948966);return +a}function ub(a){a=+a;if(!(a>3.141592653589793))return +a;do a=a+-6.283185307179586;while(a>3.141592653589793);return +a}function vb(a,b){a=a|0;b=b|0;var c=0.0,d=0.0,e=0.0;d=+p[b+8>>3];e=+p[a+8>>3];c=+K(+(d-e));if(c>3.141592653589793)c=+K(+((d<0.0?d+6.283185307179586:d)-(e<0.0?e+6.283185307179586:e)));e=1.5707963267948966-+p[a>>3];d=1.5707963267948966-+p[b>>3];e=+N(+d)*+N(+e)+ +O(+d)*+O(+e)*+N(+c);e=e>1.0?1.0:e;return +(+Q(+(e<-1.0?-1.0:e))*6371.007180918475)}function wb(a,b){a=a|0;b=b|0;var c=0.0,d=0.0,e=0.0,f=0.0,g=0.0;f=+p[b>>3];e=+N(+f);c=+p[b+8>>3]-+p[a+8>>3];g=e*+O(+c);d=+p[a>>3];return +(+T(+g,+(+N(+d)*+O(+f)-e*+O(+d)*+N(+c))))}function xb(a,b,c,d){a=a|0;b=+b;c=+c;d=d|0;var e=0,g=0.0,h=0.0,i=0,j=0.0;if(c<1.0e-16){f[d>>2]=f[a>>2];f[d+4>>2]=f[a+4>>2];f[d+8>>2]=f[a+8>>2];f[d+12>>2]=f[a+12>>2];return}h=b<0.0?b+6.283185307179586:b;h=!(b>=6.283185307179586)?h:h+-6.283185307179586;e=h<1.0e-16;do if(!e?!(+K(+(h+-3.141592653589793))<1.0e-16):0){j=+p[a>>3];g=+N(+c);b=+O(+c);c=+O(+j)*g+ +N(+j)*b*+N(+h);c=c>1.0?1.0:c;c=+R(+(c<-1.0?-1.0:c));p[d>>3]=c;if(+K(+(c+-1.5707963267948966))<1.0e-16){p[d>>3]=1.5707963267948966;b=0.0;break}if(+K(+(c+1.5707963267948966))<1.0e-16){p[d>>3]=-1.5707963267948966;b=0.0;break}else{j=+N(+c);b=b*+O(+h)/j;h=+p[a>>3];j=(g-+O(+h)*+O(+c))/+N(+h)/j;b=b>1.0?1.0:b;j=+p[a+8>>3]+ +T(+(j<-1.0?-1.0:j>1.0?1.0:b<-1.0?-1.0:b),+j);b=j<0.0?j+6.283185307179586:j;b=!(j>=6.283185307179586)?b:b+-6.283185307179586;break}}else i=5;while(0);do if((i|0)==5){b=(e?c:-c)+ +p[a>>3];p[d>>3]=b;if(+K(+(b+-1.5707963267948966))<1.0e-16){p[d>>3]=1.5707963267948966;b=0.0;break}if(+K(+(b+1.5707963267948966))<1.0e-16){p[d>>3]=-1.5707963267948966;b=0.0;break}else{j=+p[a+8>>3];b=j<0.0?j+6.283185307179586:j;b=!(j>=6.283185307179586)?b:b+-6.283185307179586;break}}while(0);p[d+8>>3]=b;return}function yb(a){a=a|0;return +(+p[1288+(a<<3)>>3])}function zb(a){a=a|0;return +(+p[1416+(a<<3)>>3])}function Ab(a){a=a|0;return +(+p[1544+(a<<3)>>3])}function Bb(a){a=a|0;return +(+p[1672+(a<<3)>>3])}function Cb(a){a=a|0;a=1800+(a<<3)|0;I=f[a+4>>2]|0;return f[a>>2]|0}function Db(a,b){a=a|0;b=b|0;b=Rc(a|0,b|0,45)|0;return b&127|0}function Eb(a,b){a=a|0;b=b|0;var c=0,d=0,e=0;d=b&1032192;if(0!=0|(b&2013265920|0)!=134217728|(d>>>0>991232|(d|0)==991232&0>0)){b=0;return b|0}c=Rc(a|0,b|0,52)|0;c=c&15;a:do if(!c)c=0;else{d=1;while(1){e=Rc(a|0,b|0,(15-d|0)*3|0)|0;if((e&7|0)==7&0==0){c=0;break}if((d|0)<(c|0))d=d+1|0;else break a}return c|0}while(0);while(1){if((c|0)>=15){c=1;d=7;break}e=Rc(a|0,b|0,(14-c|0)*3|0)|0;if((e&7|0)==7&0==0)c=c+1|0;else{c=0;d=7;break}}if((d|0)==7)return c|0;return 0}function Fb(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0;d=Rc(a|0,b|0,52)|0;d=d&15;if((d|0)>=(c|0)){if((d|0)!=(c|0))if(c>>>0<=15){e=Sc(c|0,0,52)|0;a=a|e;b=b&-15728641|I;if((d|0)>(c|0))do{e=Sc(7,0,(14-c|0)*3|0)|0;c=c+1|0;a=a|e;b=b|I}while((c|0)<(d|0))}else{b=0;a=0}}else{b=0;a=0}I=b;return a|0}function Gb(a,b,c){a=a|0;b=b|0;c=c|0;a=Rc(a|0,b|0,52)|0;a=a&15;if((a|0)>(c|0)){c=0;return c|0}c=ic(7,c-a|0)|0;return c|0}function Hb(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;var e=0,g=0,h=0,i=0,j=0;h=Rc(a|0,b|0,52)|0;h=h&15;if((h|0)>(c|0))return;if((h|0)==(c|0)){c=d;f[c>>2]=a;f[c+4>>2]=b;return}j=(ic(7,c-h|0)|0)/7|0;i=Rc(a|0,b|0,45)|0;if(!(Ia(i&127)|0))i=1;else{a:do if(!h)e=0;else{g=1;while(1){e=Rc(a|0,b|0,(15-g|0)*3|0)|0;e=e&7;if(e|0)break a;if((g|0)<(h|0))g=g+1|0;else{e=0;break}}}while(0);i=(e|0)!=0}e=Sc(h+1|0,0,52)|0;b=I|b&-15728641;h=(14-h|0)*3|0;g=Sc(7,0,h|0)|0;g=(e|a)&~g;b=b&~I;Hb(g,b,c,d);e=d+(j<<3)|0;if(i){d=Sc(1,0,h|0)|0;Hb(d|g,I|b,c,e);d=e+(j<<3)|0;i=Sc(2,0,h|0)|0;Hb(i|g,I|b,c,d);d=d+(j<<3)|0;i=Sc(3,0,h|0)|0;Hb(i|g,I|b,c,d);d=d+(j<<3)|0;i=Sc(4,0,h|0)|0;Hb(i|g,I|b,c,d);d=d+(j<<3)|0;i=Sc(5,0,h|0)|0;Hb(i|g,I|b,c,d);i=Sc(6,0,h|0)|0;Hb(i|g,I|b,c,d+(j<<3)|0);return}else{d=e+(j<<3)|0;i=Sc(2,0,h|0)|0;Hb(i|g,I|b,c,d);d=d+(j<<3)|0;i=Sc(3,0,h|0)|0;Hb(i|g,I|b,c,d);d=d+(j<<3)|0;i=Sc(4,0,h|0)|0;Hb(i|g,I|b,c,d);d=d+(j<<3)|0;i=Sc(5,0,h|0)|0;Hb(i|g,I|b,c,d);i=Sc(6,0,h|0)|0;Hb(i|g,I|b,c,d+(j<<3)|0);return}}function Ib(a,b){a=a|0;b=b|0;var c=0,d=0,e=0;e=Rc(a|0,b|0,45)|0;if(!(Ia(e&127)|0)){e=0;return e|0}e=Rc(a|0,b|0,52)|0;e=e&15;a:do if(!e)c=0;else{d=1;while(1){c=Rc(a|0,b|0,(15-d|0)*3|0)|0;c=c&7;if(c|0)break a;if((d|0)<(e|0))d=d+1|0;else{c=0;break}}}while(0);e=(c|0)==0&1;return e|0}function Jb(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0;C=u;g=a;e=f[g>>2]|0;g=f[g+4>>2]|0;d=(c|0)>0;if(0==0&(g&15728640|0)==0){if(!d){B=0;u=C;return B|0}B=b;f[B>>2]=e;f[B+4>>2]=g;if((c|0)==1){B=0;u=C;return B|0}else d=1;do{z=a+(d<<3)|0;A=f[z+4>>2]|0;B=b+(d<<3)|0;f[B>>2]=f[z>>2];f[B+4>>2]=A;d=d+1|0}while((d|0)!=(c|0));d=0;u=C;return d|0}if(!d)ea(21261,21276,223,21286);x=la()|0;y=u;u=u+((1*(c<<3)|0)+15&-16)|0;z=c<<3;Tc(y|0,a|0,z|0)|0;w=u;u=u+((1*(c<<3)|0)+15&-16)|0;Uc(w|0,0,z|0)|0;a:while(1){h=y;l=f[h>>2]|0;h=f[h+4>>2]|0;t=Rc(l|0,h|0,52)|0;t=t&15;v=t+-1|0;s=(c|0)>0;b:do if(s){p=((c|0)<0)<<31>>31;n=Sc(v|0,0,52)|0;o=I;if(v>>>0>15){d=0;e=l;g=h;while(1){if(!((e|0)==0&(g|0)==0)){a=Rc(e|0,g|0,52)|0;a=a&15;i=(a|0)<(v|0);a=(a|0)==(v|0);k=i?0:a?e:0;e=i?0:a?g:0;g=Qc(k|0,e|0,c|0,p|0)|0;a=w+(g<<3)|0;i=a;j=f[i>>2]|0;i=f[i+4>>2]|0;if((j|0)==0&(i|0)==0)g=k;else{n=g;o=0;m=j;g=k;j=a;while(1){if((o|0)>(c|0)){A=-1;break a}if((m|0)==(g|0)&(i&-117440513|0)==(e|0)){a=Rc(m|0,i|0,56)|0;a=a&7;if((a|0)==7){A=-2;break a}r=Sc(a+1|0,0,56)|0;f[j>>2]=0;f[j+4>>2]=0;j=n;g=r|g;e=I|e&-117440513}else j=(n+1|0)%(c|0)|0;a=w+(j<<3)|0;i=a;m=f[i>>2]|0;i=f[i+4>>2]|0;if((m|0)==0&(i|0)==0)break;else{n=j;o=o+1|0;j=a}}}r=a;f[r>>2]=g;f[r+4>>2]=e}d=d+1|0;if((d|0)>=(c|0))break b;g=y+(d<<3)|0;e=f[g>>2]|0;g=f[g+4>>2]|0}}else{d=0;e=l;g=h}while(1){if(!((e|0)==0&(g|0)==0)){i=Rc(e|0,g|0,52)|0;i=i&15;if((i|0)>=(v|0)){if((i|0)!=(v|0)){e=e|n;g=g&-15728641|o;if(i>>>0>=t>>>0){a=v;do{r=Sc(7,0,(14-a|0)*3|0)|0;a=a+1|0;e=r|e;g=I|g}while((a|0)<(i|0))}}}else{e=0;g=0}a=Qc(e|0,g|0,c|0,p|0)|0;j=w+(a<<3)|0;i=j;k=f[i>>2]|0;i=f[i+4>>2]|0;if((k|0)==0&(i|0)==0)a=j;else{m=0;while(1){if((m|0)>(c|0)){A=-1;break a}if((k|0)==(e|0)&(i&-117440513|0)==(g|0)){i=Rc(k|0,i|0,56)|0;i=i&7;if((i|0)==7){A=-2;break a}r=Sc(i+1|0,0,56)|0;q=j;f[q>>2]=0;f[q+4>>2]=0;e=r|e;g=I|g&-117440513}else a=(a+1|0)%(c|0)|0;j=w+(a<<3)|0;i=j;k=f[i>>2]|0;i=f[i+4>>2]|0;if((k|0)==0&(i|0)==0){a=j;break}else m=m+1|0}}r=a;f[r>>2]=e;f[r+4>>2]=g}d=d+1|0;if((d|0)>=(c|0))break b;g=y+(d<<3)|0;e=f[g>>2]|0;g=f[g+4>>2]|0}}while(0);d=(c|0)/6|0;if((c+5|0)>>>0<11){B=37;break}if((c|0)<=5){B=39;break}q=la()|0;r=u;u=u+((1*(d<<3)|0)+15&-16)|0;Uc(r|0,0,d<<3|0)|0;o=0;n=0;do{i=w+(o<<3)|0;e=i;d=f[e>>2]|0;e=f[e+4>>2]|0;if(!((d|0)==0&(e|0)==0)){j=Rc(d|0,e|0,56)|0;j=j&7;g=j+1|0;k=e&-117440513;p=Rc(d|0,e|0,45)|0;c:do if(Ia(p&127)|0){m=Rc(d|0,e|0,52)|0;m=m&15;if(m|0){a=1;while(1){p=Sc(7,0,(15-a|0)*3|0)|0;if(!((d&p|0)==0&(k&I|0)==0))break c;if((a|0)<(m|0))a=a+1|0;else break}}e=Sc(g|0,0,56)|0;d=d|e;e=k|I;g=i;f[g>>2]=d;f[g+4>>2]=e;g=j+2|0}while(0);if((g|0)==7){p=r+(n<<3)|0;f[p>>2]=d;f[p+4>>2]=e&-117440513;n=n+1|0}}o=o+1|0}while((o|0)!=(c|0));d:do if(s){p=((c|0)<0)<<31>>31;m=Sc(v|0,0,52)|0;o=I;if(v>>>0>15){e=0;d=0;while(1){do if(!((l|0)==0&(h|0)==0)){j=Rc(l|0,h|0,52)|0;j=j&15;a=(j|0)<(v|0);j=(j|0)==(v|0);i=a?0:j?l:0;j=a?0:j?h:0;a=Qc(i|0,j|0,c|0,p|0)|0;g=0;while(1){if((g|0)>(c|0)){B=74;break a}t=w+(a<<3)|0;k=f[t+4>>2]|0;if((k&-117440513|0)==(j|0)?(f[t>>2]|0)==(i|0):0){B=48;break}a=(a+1|0)%(c|0)|0;t=w+(a<<3)|0;if((f[t>>2]|0)==(i|0)?(f[t+4>>2]|0)==(j|0):0)break;else g=g+1|0}if((B|0)==48?(B=0,0==0&(k&117440512|0)==100663296):0)break;t=b+(d<<3)|0;f[t>>2]=l;f[t+4>>2]=h;d=d+1|0}while(0);e=e+1|0;if((e|0)>=(c|0))break d;h=y+(e<<3)|0;l=f[h>>2]|0;h=f[h+4>>2]|0}}else{e=0;d=0}while(1){do if(!((l|0)==0&(h|0)==0)){j=Rc(l|0,h|0,52)|0;j=j&15;if((j|0)>=(v|0))if((j|0)!=(v|0)){g=l|m;a=h&-15728641|o;if(j>>>0<t>>>0)j=a;else{i=v;do{s=Sc(7,0,(14-i|0)*3|0)|0;i=i+1|0;g=s|g;a=I|a}while((i|0)<(j|0));j=a}}else{g=l;j=h}else{g=0;j=0}i=Qc(g|0,j|0,c|0,p|0)|0;a=0;while(1){if((a|0)>(c|0)){B=74;break a}s=w+(i<<3)|0;k=f[s+4>>2]|0;if((k&-117440513|0)==(j|0)?(f[s>>2]|0)==(g|0):0){B=69;break}i=(i+1|0)%(c|0)|0;s=w+(i<<3)|0;if((f[s>>2]|0)==(g|0)?(f[s+4>>2]|0)==(j|0):0)break;else a=a+1|0}if((B|0)==69?(B=0,0==0&(k&117440512|0)==100663296):0)break;s=b+(d<<3)|0;f[s>>2]=l;f[s+4>>2]=h;d=d+1|0}while(0);e=e+1|0;if((e|0)>=(c|0))break d;h=y+(e<<3)|0;l=f[h>>2]|0;h=f[h+4>>2]|0}}else d=0;while(0);Uc(w|0,0,z|0)|0;Tc(y|0,r|0,z|0)|0;ka(q|0);if(!n){A=0;break}else{b=b+(d<<3)|0;c=n}}if((B|0)==37){Tc(b|0,y|0,c<<3|0)|0;A=0}else if((B|0)==39)ea(21294,21276,278,21286);else if((B|0)==74){ka(q|0);A=-1}ka(x|0);B=A;u=C;return B|0}function Kb(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;var g=0,h=0,i=0,j=0,k=0,l=0;if((b|0)>0){g=0;l=0}else{e=0;return e|0}a:while(1){if((g|0)>=(d|0)){g=-1;h=10;break}k=a+(l<<3)|0;i=k;h=f[i>>2]|0;i=f[i+4>>2]|0;do if(!((h|0)==0&(i|0)==0)){j=Rc(h|0,i|0,52)|0;j=j&15;if((j|0)>(e|0)){g=-2;h=10;break a}if((j|0)==(e|0)){k=c+(g<<3)|0;f[k>>2]=h;f[k+4>>2]=i;g=g+1|0;break}h=(ic(7,e-j|0)|0)+g|0;if((h|0)>(d|0)){g=-1;h=10;break a}Hb(f[k>>2]|0,f[k+4>>2]|0,e,c+(g<<3)|0);g=h}while(0);l=l+1|0;if((l|0)>=(b|0)){g=0;h=10;break}}if((h|0)==10)return g|0;return 0}function Lb(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0,g=0,h=0;if((b|0)>0){d=0;h=0}else{c=0;return c|0}while(1){e=a+(h<<3)|0;g=f[e>>2]|0;e=f[e+4>>2]|0;if(!((g|0)==0&(e|0)==0)){e=Rc(g|0,e|0,52)|0;e=e&15;if((e|0)>(c|0)){d=-1;e=8;break}if((e|0)==(c|0))e=1;else e=ic(7,c-e|0)|0;d=e+d|0}h=h+1|0;if((h|0)>=(b|0)){e=8;break}}if((e|0)==8)return d|0;return 0}function Mb(a,b){a=a|0;b=b|0;b=Rc(a|0,b|0,52)|0;return b&1|0}function Nb(a,b){a=a|0;b=b|0;var c=0,d=0,e=0;e=Rc(a|0,b|0,52)|0;e=e&15;if(!e){e=0;return e|0}else d=1;while(1){c=Rc(a|0,b|0,(15-d|0)*3|0)|0;c=c&7;if(c|0){d=4;break}if((d|0)<(e|0))d=d+1|0;else{c=0;d=4;break}}if((d|0)==4)return c|0;return 0}function Ob(a,b){a=a|0;b=b|0;var c=0,d=0,e=0,f=0,g=0,h=0,i=0;g=Rc(a|0,b|0,52)|0;g=g&15;if(!g){f=b;g=a;I=f;return g|0}else{f=1;c=0}while(1){h=(15-f|0)*3|0;d=Sc(7,0,h|0)|0;e=I;i=Rc(a|0,b|0,h|0)|0;i=fb(i&7)|0;h=Sc(i|0,((i|0)<0)<<31>>31|0,h|0)|0;a=h|a&~d;b=I|b&~e;a:do if(!c)if(!((a&d|0)==0&(b&e|0)==0)){d=Rc(a|0,b|0,52)|0;d=d&15;if(!d)c=1;else{c=1;b:while(1){i=Rc(a|0,b|0,(15-c|0)*3|0)|0;switch(i&7){case 1:{c=1;break b}case 0:break;default:{c=1;break a}}if((c|0)<(d|0))c=c+1|0;else{c=1;break a}}while(1){i=(15-c|0)*3|0;e=Rc(a|0,b|0,i|0)|0;h=Sc(7,0,i|0)|0;b=b&~I;e=fb(e&7)|0;i=Sc(e|0,((e|0)<0)<<31>>31|0,i|0)|0;a=a&~h|i;b=b|I;if((c|0)<(d|0))c=c+1|0;else{c=1;break}}}}else c=0;while(0);if((f|0)<(g|0))f=f+1|0;else break}I=b;return a|0}function Pb(a,b){a=a|0;b=b|0;var c=0,d=0,e=0,f=0,g=0;d=Rc(a|0,b|0,52)|0;d=d&15;if(!d){c=b;d=a;I=c;return d|0}else c=1;while(1){f=(15-c|0)*3|0;g=Rc(a|0,b|0,f|0)|0;e=Sc(7,0,f|0)|0;b=b&~I;g=fb(g&7)|0;f=Sc(g|0,((g|0)<0)<<31>>31|0,f|0)|0;a=f|a&~e;b=I|b;if((c|0)<(d|0))c=c+1|0;else break}I=b;return a|0}function Qb(a,b){a=a|0;b=b|0;var c=0,d=0,e=0,f=0,g=0;d=Rc(a|0,b|0,52)|0;d=d&15;if(!d){c=b;d=a;I=c;return d|0}else c=1;while(1){g=(15-c|0)*3|0;f=Sc(7,0,g|0)|0;e=b&~I;b=Rc(a|0,b|0,g|0)|0;b=gb(b&7)|0;b=Sc(b|0,((b|0)<0)<<31>>31|0,g|0)|0;a=b|a&~f;b=I|e;if((c|0)<(d|0))c=c+1|0;else break}I=b;return a|0}function Rb(a,b){a=a|0;b=b|0;var c=0,d=0,e=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0;j=u;u=u+64|0;i=j+40|0;d=j+24|0;e=j+12|0;g=j;Sc(b|0,0,52)|0;c=I|134225919;if(!b){if((f[a+4>>2]|0)>2){h=0;i=0;I=h;u=j;return i|0}if((f[a+8>>2]|0)>2){h=0;i=0;I=h;u=j;return i|0}if((f[a+12>>2]|0)>2){h=0;i=0;I=h;u=j;return i|0}Sc(Ja(a)|0,0,45)|0;h=I|c;i=-1;I=h;u=j;return i|0};f[i>>2]=f[a>>2];f[i+4>>2]=f[a+4>>2];f[i+8>>2]=f[a+8>>2];f[i+12>>2]=f[a+12>>2];h=i+4|0;if((b|0)>0){a=-1;while(1){f[d>>2]=f[h>>2];f[d+4>>2]=f[h+4>>2];f[d+8>>2]=f[h+8>>2];if(!(b&1)){$a(h);f[e>>2]=f[h>>2];f[e+4>>2]=f[h+4>>2];f[e+8>>2]=f[h+8>>2];bb(e)}else{_a(h);f[e>>2]=f[h>>2];f[e+4>>2]=f[h+4>>2];f[e+8>>2]=f[h+8>>2];ab(e)}Xa(d,e,g);Ua(g);l=(15-b|0)*3|0;k=Sc(7,0,l|0)|0;c=c&~I;m=Za(g)|0;l=Sc(m|0,((m|0)<0)<<31>>31|0,l|0)|0;a=l|a&~k;c=I|c;if((b|0)>1)b=b+-1|0;else break}}else a=-1;a:do if(((f[h>>2]|0)<=2?(f[i+8>>2]|0)<=2:0)?(f[i+12>>2]|0)<=2:0){d=Ja(i)|0;b=Sc(d|0,0,45)|0;b=b|a;a=I|c&-1040385;g=Ka(i)|0;if(!(Ia(d)|0)){if((g|0)>0)e=0;else break;while(1){d=Rc(b|0,a|0,52)|0;d=d&15;if(d){c=1;while(1){m=(15-c|0)*3|0;k=Rc(b|0,a|0,m|0)|0;l=Sc(7,0,m|0)|0;a=a&~I;k=fb(k&7)|0;m=Sc(k|0,((k|0)<0)<<31>>31|0,m|0)|0;b=b&~l|m;a=a|I;if((c|0)<(d|0))c=c+1|0;else break}}e=e+1|0;if((e|0)==(g|0))break a}}e=Rc(b|0,a|0,52)|0;e=e&15;b:do if(e){c=1;c:while(1){m=Rc(b|0,a|0,(15-c|0)*3|0)|0;switch(m&7){case 1:break c;case 0:break;default:break b}if((c|0)<(e|0))c=c+1|0;else break b}if(La(d,f[i>>2]|0)|0){c=1;while(1){k=(15-c|0)*3|0;l=Sc(7,0,k|0)|0;m=a&~I;a=Rc(b|0,a|0,k|0)|0;a=gb(a&7)|0;a=Sc(a|0,((a|0)<0)<<31>>31|0,k|0)|0;b=b&~l|a;a=m|I;if((c|0)<(e|0))c=c+1|0;else break}}else{c=1;while(1){m=(15-c|0)*3|0;k=Rc(b|0,a|0,m|0)|0;l=Sc(7,0,m|0)|0;a=a&~I;k=fb(k&7)|0;m=Sc(k|0,((k|0)<0)<<31>>31|0,m|0)|0;b=b&~l|m;a=a|I;if((c|0)<(e|0))c=c+1|0;else break}}}while(0);if((g|0)>0){c=0;do{b=Ob(b,a)|0;a=I;c=c+1|0}while((c|0)!=(g|0))}}else{b=0;a=0}while(0);l=a;m=b;I=l;u=j;return m|0}function Sb(a){a=a|0;return (a|0)%2|0|0}function Tb(a,b){a=a|0;b=b|0;var c=0,d=0;d=u;u=u+16|0;c=d;if((b>>>0<=15?!(0==0?(f[a+4>>2]&2146435072|0)==2146435072:0):0)?!(0==0?(f[a+8+4>>2]&2146435072|0)==2146435072:0):0){jb(a,b,c);b=Rb(c,b)|0;a=I}else{a=0;b=0}I=a;u=d;return b|0}function Ub(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0,g=0,h=0;e=c+4|0;g=Rc(a|0,b|0,52)|0;g=g&15;h=Rc(a|0,b|0,45)|0;d=(g|0)==0;if(!(Ia(h&127)|0)){if(d){h=0;return h|0}if((f[e>>2]|0)==0?(f[c+8>>2]|0)==0:0)d=(f[c+12>>2]|0)!=0&1;else d=1}else if(d){h=1;return h|0}else d=1;c=1;while(1){if(!(c&1))bb(e);else ab(e);h=Rc(a|0,b|0,(15-c|0)*3|0)|0;cb(e,h&7);if((c|0)<(g|0))c=c+1|0;else break}return d|0}function Vb(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0,g=0,h=0,i=0,j=0,k=0,l=0;l=u;u=u+16|0;j=l;k=Rc(a|0,b|0,45)|0;k=k&127;a:do if((Ia(k)|0)!=0?(g=Rc(a|0,b|0,52)|0,g=g&15,(g|0)!=0):0){d=1;b:while(1){i=Rc(a|0,b|0,(15-d|0)*3|0)|0;switch(i&7){case 5:{e=1;d=b;break b}case 0:break;default:{d=b;break a}}if((d|0)<(g|0))d=d+1|0;else{d=b;break a}}while(1){b=(15-e|0)*3|0;h=Sc(7,0,b|0)|0;i=d&~I;d=Rc(a|0,d|0,b|0)|0;d=gb(d&7)|0;d=Sc(d|0,((d|0)<0)<<31>>31|0,b|0)|0;a=a&~h|d;d=i|I;if((e|0)<(g|0))e=e+1|0;else break}}else d=b;while(0);i=9568+(k*28|0)|0;f[c>>2]=f[i>>2];f[c+4>>2]=f[i+4>>2];f[c+8>>2]=f[i+8>>2];f[c+12>>2]=f[i+12>>2];if(!(Ub(a,d,c)|0)){u=l;return}h=c+4|0;f[j>>2]=f[h>>2];f[j+4>>2]=f[h+4>>2];f[j+8>>2]=f[h+8>>2];g=Rc(a|0,d|0,52)|0;i=g&15;if(!(g&1))g=i;else{bb(h);g=i+1|0}if(!(Ia(k)|0))d=0;else{c:do if(!i)d=0;else{b=1;while(1){e=Rc(a|0,d|0,(15-b|0)*3|0)|0;e=e&7;if(e|0){d=e;break c}if((b|0)<(i|0))b=b+1|0;else{d=0;break}}}while(0);d=(d|0)==4&1}if(!(ob(c,g,d,0)|0)){if((g|0)!=(i|0)){f[h>>2]=f[j>>2];f[h+4>>2]=f[j+4>>2];f[h+8>>2]=f[j+8>>2]}}else{if(Ia(k)|0)do{}while((ob(c,g,0,0)|0)!=0);if((g|0)!=(i|0))$a(h)}u=l;return}function Wb(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0;d=u;u=u+16|0;e=d;Vb(a,b,e);b=Rc(a|0,b|0,52)|0;mb(e,b&15,c);u=d;return}function Xb(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0,f=0,g=0,h=0;h=u;u=u+16|0;f=h;Vb(a,b,f);g=Rc(a|0,b|0,52)|0;g=g&15;e=Rc(a|0,b|0,45)|0;if(!(Ia(e&127)|0)){b=0;pb(f,g,b,c);u=h;return}a:do if(!g)d=0;else{e=1;while(1){d=Rc(a|0,b|0,(15-e|0)*3|0)|0;d=d&7;if(d|0)break a;if((e|0)<(g|0))e=e+1|0;else{d=0;break}}}while(0);b=(d|0)==0&1;pb(f,g,b,c);u=h;return}function Yb(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;var e=0,g=0,h=0,i=0,j=0,k=0;i=u;u=u+64|0;h=i;if((a|0)==(c|0)&(b|0)==(d|0)|(0!=0|(b&2013265920|0)!=134217728|(0!=0|(d&2013265920|0)!=134217728))){h=0;u=i;return h|0}e=Rc(a|0,b|0,52)|0;e=e&15;g=Rc(c|0,d|0,52)|0;if((e|0)!=(g&15|0)){h=0;u=i;return h|0}g=e+-1|0;if(e>>>0>1?(k=Fb(a,b,g)|0,j=I,g=Fb(c,d,g)|0,(k|0)==(g|0)&(j|0)==(I|0)):0){g=(e^15)*3|0;e=Rc(a|0,b|0,g|0)|0;e=e&7;g=Rc(c|0,d|0,g|0)|0;g=g&7;if((e|0)==0|(g|0)==0){k=1;u=i;return k|0}if((f[20988+(e<<2)>>2]|0)==(g|0)){k=1;u=i;return k|0}if((f[21016+(e<<2)>>2]|0)==(g|0)){k=1;u=i;return k|0}}e=h;g=e+56|0;do{f[e>>2]=0;e=e+4|0}while((e|0)<(g|0));wa(a,b,1,h);k=h;if(((((!((f[k>>2]|0)==(c|0)?(f[k+4>>2]|0)==(d|0):0)?(k=h+8|0,!((f[k>>2]|0)==(c|0)?(f[k+4>>2]|0)==(d|0):0)):0)?(k=h+16|0,!((f[k>>2]|0)==(c|0)?(f[k+4>>2]|0)==(d|0):0)):0)?(k=h+24|0,!((f[k>>2]|0)==(c|0)?(f[k+4>>2]|0)==(d|0):0)):0)?(k=h+32|0,!((f[k>>2]|0)==(c|0)?(f[k+4>>2]|0)==(d|0):0)):0)?(k=h+40|0,!((f[k>>2]|0)==(c|0)?(f[k+4>>2]|0)==(d|0):0)):0){e=h+48|0;e=((f[e>>2]|0)==(c|0)?(f[e+4>>2]|0)==(d|0):0)&1}else e=1;k=e;u=i;return k|0}function Zb(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;var e=0,g=0,h=0,i=0;h=u;u=u+16|0;e=h;if(!(Yb(a,b,c,d)|0)){e=0;g=0;I=e;u=h;return g|0}g=b&-2130706433;f[e>>2]=0;i=Aa(a,b,1,e)|0;if((i|0)==(c|0)&(I|0)==(d|0)){g=g|285212672;i=a;I=g;u=h;return i|0}f[e>>2]=0;i=Aa(a,b,2,e)|0;if((i|0)==(c|0)&(I|0)==(d|0)){g=g|301989888;i=a;I=g;u=h;return i|0}f[e>>2]=0;i=Aa(a,b,3,e)|0;if((i|0)==(c|0)&(I|0)==(d|0)){g=g|318767104;i=a;I=g;u=h;return i|0}f[e>>2]=0;i=Aa(a,b,4,e)|0;if((i|0)==(c|0)&(I|0)==(d|0)){g=g|335544320;i=a;I=g;u=h;return i|0}f[e>>2]=0;i=Aa(a,b,5,e)|0;if((i|0)==(c|0)&(I|0)==(d|0)){g=g|352321536;i=a;I=g;u=h;return i|0}else{f[e>>2]=0;i=Aa(a,b,6,e)|0;i=(i|0)==(c|0)&(I|0)==(d|0);I=i?g|369098752:0;u=h;return (i?a:0)|0}return 0}function _b(a,b){a=a|0;b=b|0;var c=0;c=0==0&(b&2013265920|0)==268435456;I=c?b&-2130706433|134217728:0;return (c?a:0)|0}function $b(a,b){a=a|0;b=b|0;var c=0,d=0,e=0;d=u;u=u+16|0;c=d;if(!(0==0&(b&2013265920|0)==268435456)){b=0;c=0;I=b;u=d;return c|0}e=Rc(a|0,b|0,56)|0;f[c>>2]=0;c=Aa(a,b&-2130706433|134217728,e&7,c)|0;b=I;I=b;u=d;return c|0}function ac(a,b){a=a|0;b=b|0;var c=0;if(!(0==0&(b&2013265920|0)==268435456)){c=0;return c|0}c=Rc(a|0,b|0,56)|0;switch(c&7){case 0:case 7:{c=0;return c|0}default:{}}b=b&-2130706433|134217728;if((c&7|0)==1&0==0&(Ib(a,b)|0)!=0){c=0;return c|0}c=Eb(a,b)|0;return c|0}function bc(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0,g=0,h=0,i=0;g=u;u=u+16|0;d=g;h=0==0&(b&2013265920|0)==268435456;e=b&-2130706433|134217728;i=c;f[i>>2]=h?a:0;f[i+4>>2]=h?e:0;if(h){b=Rc(a|0,b|0,56)|0;f[d>>2]=0;a=Aa(a,e,b&7,d)|0;b=I}else{a=0;b=0}i=c+8|0;f[i>>2]=a;f[i+4>>2]=b;u=g;return}function cc(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0;e=(Ib(a,b)|0)==1;b=b&-2130706433;d=c;f[d>>2]=e?0:a;f[d+4>>2]=e?0:b|285212672;d=c+8|0;f[d>>2]=a;f[d+4>>2]=b|301989888;d=c+16|0;f[d>>2]=a;f[d+4>>2]=b|318767104;d=c+24|0;f[d>>2]=a;f[d+4>>2]=b|335544320;d=c+32|0;f[d>>2]=a;f[d+4>>2]=b|352321536;c=c+40|0;f[c>>2]=a;f[c+4>>2]=b|369098752;return}function dc(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0,g=0,h=0,i=0,j=0,k=0;k=u;u=u+352|0;e=k+336|0;i=k+168|0;j=k;Uc(i|0,0,168)|0;Uc(j|0,0,168)|0;h=0==0&(b&2013265920|0)==268435456;d=b&-2130706433|134217728;Xb(h?a:0,h?d:0,i);if(h){b=Rc(a|0,b|0,56)|0;f[e>>2]=0;a=Aa(a,d,b&7,e)|0;b=I}else{a=0;b=0}Xb(a,b,j);b=f[i>>2]|0;if((b|0)<=0){j=0;f[c>>2]=j;u=k;return}h=0;a=0;d=f[j>>2]|0;do{if((d|0)>0){e=i+8+(h<<4)|0;g=i+8+(h<<4)+8|0;b=0;do{if(rb(e,j+8+(b<<4)|0,1.0e-06)|0){p[c+8+(a<<4)>>3]=+p[e>>3];p[c+8+(a<<4)+8>>3]=+p[g>>3];a=a+1|0}b=b+1|0;d=f[j>>2]|0}while((b|0)<(d|0));b=f[i>>2]|0}h=h+1|0}while((h|0)<(b|0));f[c>>2]=a;u=k;return}function ec(a){a=a|0;f[a>>2]=0;f[a+4>>2]=0;f[a+8>>2]=0;return}function fc(a){a=a|0;var b=0,c=0,d=0;b=Dc(1,12)|0;if(!b)ea(21332,21320,66,21345);c=a+4|0;d=f[c>>2]|0;if(d|0){d=d+8|0;f[d>>2]=b;f[c>>2]=b;return b|0}if(f[a>>2]|0)ea(21359,21320,70,21345);d=a;f[d>>2]=b;f[c>>2]=b;return b|0}function gc(a,b){a=a|0;b=b|0;var c=0,d=0;d=Dc(1,24)|0;if(!d)ea(21382,21320,88,21396);f[d>>2]=f[b>>2];f[d+4>>2]=f[b+4>>2];f[d+8>>2]=f[b+8>>2];f[d+12>>2]=f[b+12>>2];b=a+4|0;c=f[b>>2]|0;if(c|0){f[c+16>>2]=d;f[b>>2]=d;return d|0}if(f[a>>2]|0)ea(21411,21320,93,21396);f[a>>2]=d;f[b>>2]=d;return d|0}function hc(a){a=a|0;var b=0,c=0,d=0,e=0;if(!a)return;else d=1;while(1){b=f[a>>2]|0;if(b|0)do{c=f[b>>2]|0;if(c|0)do{e=c;c=f[c+16>>2]|0;Cc(e)}while((c|0)!=0);e=b;b=f[b+8>>2]|0;Cc(e)}while((b|0)!=0);b=a;a=f[a+8>>2]|0;if(!d)Cc(b);if(!a)break;else d=0}return}function ic(a,b){a=a|0;b=b|0;var c=0;if(!b){c=1;return c|0}else{c=a;a=1}do{a=X((b&1|0)==0?1:c,a)|0;b=b>>1;c=X(c,c)|0}while((b|0)!=0);return a|0}function jc(){return 8}function kc(){return 16}function lc(){return 168}function mc(){return 8}function nc(){return 16}function oc(){return 12}function pc(a){a=a|0;var b=0.0,c=0.0;c=+p[a>>3];b=+p[a+8>>3];return +(+L(+(c*c+b*b)))}function qc(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;var f=0.0,g=0.0,h=0.0,i=0.0,j=0.0,k=0.0,l=0.0,m=0.0;j=+p[a>>3];i=+p[b>>3]-j;h=+p[a+8>>3];g=+p[b+8>>3]-h;l=+p[c>>3];f=+p[d>>3]-l;m=+p[c+8>>3];k=+p[d+8>>3]-m;f=(f*(h-m)-(j-l)*k)/(i*k-g*f);p[e>>3]=j+i*f;p[e+8>>3]=h+g*f;return}function rc(a,b){a=a|0;b=b|0;if(!(+p[a>>3]==+p[b>>3])){b=0;return b|0}b=+p[a+8>>3]==+p[b+8>>3];return b|0}function sc(a,b){a=a|0;b=b|0;var c=0.0,d=0.0,e=0.0;e=+p[a>>3]-+p[b>>3];d=+p[a+8>>3]-+p[b+8>>3];c=+p[a+16>>3]-+p[b+16>>3];return +(e*e+d*d+c*c)}function tc(a,b){a=a|0;b=b|0;var c=0.0,d=0.0,e=0.0;c=+p[a>>3];d=+N(+c);c=+O(+c);p[b+16>>3]=c;c=+p[a+8>>3];e=d*+N(+c);p[b>>3]=e;c=d*+O(+c);p[b+8>>3]=c;return}function uc(a,b,c){a=a|0;b=b|0;c=c|0;var d=0;if((b|0)>0){d=Dc(b,4)|0;f[a>>2]=d;if(!d)ea(21431,21454,37,21468)}else f[a>>2]=0;f[a+4>>2]=b;f[a+8>>2]=0;f[a+12>>2]=c;return}function vc(a){a=a|0;var b=0,c=0,d=0,e=0,g=0,h=0,i=0;e=a+4|0;g=a+12|0;h=a+8|0;a:while(1){c=f[e>>2]|0;b=0;while(1){if((b|0)>=(c|0))break a;d=f[a>>2]|0;i=f[d+(b<<2)>>2]|0;if(!i)b=b+1|0;else break}c=d+(~~+Fc(+M(10.0,+(+(15-(f[g>>2]|0)|0)))*(+p[i>>3]+ +p[i+8>>3]),+(c|0))>>>0<<2)|0;b=f[c>>2]|0;if(!b)continue;d=i+32|0;if((b|0)==(i|0))f[c>>2]=f[d>>2];else{while(1){c=b+32|0;b=f[c>>2]|0;if(!b)continue a;if((b|0)==(i|0))break}f[c>>2]=f[d>>2]}Cc(i);f[h>>2]=(f[h>>2]|0)+-1}Cc(f[a>>2]|0);return}function wc(a){a=a|0;var b=0,c=0,d=0;d=f[a+4>>2]|0;c=0;while(1){if((c|0)>=(d|0)){b=0;c=4;break}b=f[(f[a>>2]|0)+(c<<2)>>2]|0;if(!b)c=c+1|0;else{c=4;break}}if((c|0)==4)return b|0;return 0}function xc(a,b){a=a|0;b=b|0;var c=0,d=0,e=0,g=0;d=~~+Fc(+M(10.0,+(+(15-(f[a+12>>2]|0)|0)))*(+p[b>>3]+ +p[b+8>>3]),+(f[a+4>>2]|0))>>>0;d=(f[a>>2]|0)+(d<<2)|0;c=f[d>>2]|0;if(!c){g=1;return g|0}g=b+32|0;do if((c|0)!=(b|0)){while(1){d=c+32|0;c=f[d>>2]|0;if(!c){c=1;e=8;break}if((c|0)==(b|0)){e=6;break}}if((e|0)==6){f[d>>2]=f[g>>2];break}else if((e|0)==8)return c|0}else f[d>>2]=f[g>>2];while(0);Cc(b);g=a+8|0;f[g>>2]=(f[g>>2]|0)+-1;g=0;return g|0}function yc(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0,g=0,h=0;g=Bc(40)|0;if(!g)ea(21484,21454,95,21497);f[g>>2]=f[b>>2];f[g+4>>2]=f[b+4>>2];f[g+8>>2]=f[b+8>>2];f[g+12>>2]=f[b+12>>2];e=g+16|0;f[e>>2]=f[c>>2];f[e+4>>2]=f[c+4>>2];f[e+8>>2]=f[c+8>>2];f[e+12>>2]=f[c+12>>2];f[g+32>>2]=0;e=~~+Fc(+M(10.0,+(+(15-(f[a+12>>2]|0)|0)))*(+p[b>>3]+ +p[b+8>>3]),+(f[a+4>>2]|0))>>>0;e=(f[a>>2]|0)+(e<<2)|0;d=f[e>>2]|0;do if(!d)f[e>>2]=g;else{while(1){if(sb(d,b)|0?sb(d+16|0,c)|0:0)break;e=f[d+32>>2]|0;d=(e|0)==0?d:e;e=d+32|0;if(!(f[e>>2]|0)){h=9;break}}if((h|0)==9){f[e>>2]=g;break}Cc(g);h=d;return h|0}while(0);h=a+8|0;f[h>>2]=(f[h>>2]|0)+1;h=g;return h|0}function zc(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0;d=~~+Fc(+M(10.0,+(+(15-(f[a+12>>2]|0)|0)))*(+p[b>>3]+ +p[b+8>>3]),+(f[a+4>>2]|0))>>>0;a=f[(f[a>>2]|0)+(d<<2)>>2]|0;if(!a){c=0;return c|0}if(!c){while(1){if(sb(a,b)|0){d=8;break}a=f[a+32>>2]|0;if(!a){a=0;d=8;break}}if((d|0)==8)return a|0}else e=a;while(1){if(sb(e,b)|0?sb(e+16|0,c)|0:0){a=e;d=8;break}e=f[e+32>>2]|0;if(!e){a=0;d=8;break}}if((d|0)==8)return a|0;return 0}function Ac(a,b){a=a|0;b=b|0;var c=0;c=~~+Fc(+M(10.0,+(+(15-(f[a+12>>2]|0)|0)))*(+p[b>>3]+ +p[b+8>>3]),+(f[a+4>>2]|0))>>>0;a=f[(f[a>>2]|0)+(c<<2)>>2]|0;if(!a){c=0;return c|0}while(1){if(sb(a,b)|0){b=4;break}a=f[a+32>>2]|0;if(!a){a=0;b=4;break}}if((b|0)==4)return a|0;return 0}function Bc(a){a=a|0;var b=0,c=0,d=0,e=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,v=0,w=0,x=0;x=u;u=u+16|0;o=x;do if(a>>>0<245){l=a>>>0<11?16:a+11&-8;a=l>>>3;n=f[5378]|0;c=n>>>a;if(c&3|0){b=(c&1^1)+a|0;a=21552+(b<<1<<2)|0;c=a+8|0;d=f[c>>2]|0;e=d+8|0;g=f[e>>2]|0;if((g|0)==(a|0))f[5378]=n&~(1<<b);else{f[g+12>>2]=a;f[c>>2]=g}w=b<<3;f[d+4>>2]=w|3;w=d+w+4|0;f[w>>2]=f[w>>2]|1;w=e;u=x;return w|0}m=f[5380]|0;if(l>>>0>m>>>0){if(c|0){b=2<<a;b=c<<a&(b|0-b);b=(b&0-b)+-1|0;i=b>>>12&16;b=b>>>i;c=b>>>5&8;b=b>>>c;g=b>>>2&4;b=b>>>g;a=b>>>1&2;b=b>>>a;d=b>>>1&1;d=(c|i|g|a|d)+(b>>>d)|0;b=21552+(d<<1<<2)|0;a=b+8|0;g=f[a>>2]|0;i=g+8|0;c=f[i>>2]|0;if((c|0)==(b|0)){a=n&~(1<<d);f[5378]=a}else{f[c+12>>2]=b;f[a>>2]=c;a=n}w=d<<3;h=w-l|0;f[g+4>>2]=l|3;e=g+l|0;f[e+4>>2]=h|1;f[g+w>>2]=h;if(m|0){d=f[5383]|0;b=m>>>3;c=21552+(b<<1<<2)|0;b=1<<b;if(!(a&b)){f[5378]=a|b;b=c;a=c+8|0}else{a=c+8|0;b=f[a>>2]|0}f[a>>2]=d;f[b+12>>2]=d;f[d+8>>2]=b;f[d+12>>2]=c}f[5380]=h;f[5383]=e;w=i;u=x;return w|0}j=f[5379]|0;if(j){c=(j&0-j)+-1|0;i=c>>>12&16;c=c>>>i;h=c>>>5&8;c=c>>>h;k=c>>>2&4;c=c>>>k;d=c>>>1&2;c=c>>>d;a=c>>>1&1;a=f[21816+((h|i|k|d|a)+(c>>>a)<<2)>>2]|0;c=(f[a+4>>2]&-8)-l|0;d=f[a+16+(((f[a+16>>2]|0)==0&1)<<2)>>2]|0;if(!d){k=a;h=c}else{do{i=(f[d+4>>2]&-8)-l|0;k=i>>>0<c>>>0;c=k?i:c;a=k?d:a;d=f[d+16+(((f[d+16>>2]|0)==0&1)<<2)>>2]|0}while((d|0)!=0);k=a;h=c}i=k+l|0;if(i>>>0>k>>>0){e=f[k+24>>2]|0;b=f[k+12>>2]|0;do if((b|0)==(k|0)){a=k+20|0;b=f[a>>2]|0;if(!b){a=k+16|0;b=f[a>>2]|0;if(!b){c=0;break}}while(1){c=b+20|0;d=f[c>>2]|0;if(d|0){b=d;a=c;continue}c=b+16|0;d=f[c>>2]|0;if(!d)break;else{b=d;a=c}}f[a>>2]=0;c=b}else{c=f[k+8>>2]|0;f[c+12>>2]=b;f[b+8>>2]=c;c=b}while(0);do if(e|0){b=f[k+28>>2]|0;a=21816+(b<<2)|0;if((k|0)==(f[a>>2]|0)){f[a>>2]=c;if(!c){f[5379]=j&~(1<<b);break}}else{f[e+16+(((f[e+16>>2]|0)!=(k|0)&1)<<2)>>2]=c;if(!c)break}f[c+24>>2]=e;b=f[k+16>>2]|0;if(b|0){f[c+16>>2]=b;f[b+24>>2]=c}b=f[k+20>>2]|0;if(b|0){f[c+20>>2]=b;f[b+24>>2]=c}}while(0);if(h>>>0<16){w=h+l|0;f[k+4>>2]=w|3;w=k+w+4|0;f[w>>2]=f[w>>2]|1}else{f[k+4>>2]=l|3;f[i+4>>2]=h|1;f[i+h>>2]=h;if(m|0){d=f[5383]|0;b=m>>>3;c=21552+(b<<1<<2)|0;b=1<<b;if(!(n&b)){f[5378]=n|b;b=c;a=c+8|0}else{a=c+8|0;b=f[a>>2]|0}f[a>>2]=d;f[b+12>>2]=d;f[d+8>>2]=b;f[d+12>>2]=c}f[5380]=h;f[5383]=i}w=k+8|0;u=x;return w|0}else m=l}else m=l}else m=l}else if(a>>>0<=4294967231){a=a+11|0;l=a&-8;k=f[5379]|0;if(k){d=0-l|0;a=a>>>8;if(a)if(l>>>0>16777215)j=31;else{n=(a+1048320|0)>>>16&8;v=a<<n;m=(v+520192|0)>>>16&4;v=v<<m;j=(v+245760|0)>>>16&2;j=14-(m|n|j)+(v<<j>>>15)|0;j=l>>>(j+7|0)&1|j<<1}else j=0;c=f[21816+(j<<2)>>2]|0;a:do if(!c){c=0;a=0;v=57}else{a=0;i=c;h=l<<((j|0)==31?0:25-(j>>>1)|0);c=0;while(1){e=(f[i+4>>2]&-8)-l|0;if(e>>>0<d>>>0)if(!e){d=0;c=i;a=i;v=61;break a}else{a=i;d=e}e=f[i+20>>2]|0;i=f[i+16+(h>>>31<<2)>>2]|0;c=(e|0)==0|(e|0)==(i|0)?c:e;e=(i|0)==0;if(e){v=57;break}else h=h<<((e^1)&1)}}while(0);if((v|0)==57){if((c|0)==0&(a|0)==0){a=2<<j;a=k&(a|0-a);if(!a){m=l;break}n=(a&0-a)+-1|0;i=n>>>12&16;n=n>>>i;h=n>>>5&8;n=n>>>h;j=n>>>2&4;n=n>>>j;m=n>>>1&2;n=n>>>m;c=n>>>1&1;a=0;c=f[21816+((h|i|j|m|c)+(n>>>c)<<2)>>2]|0}if(!c){i=a;h=d}else v=61}if((v|0)==61)while(1){v=0;m=(f[c+4>>2]&-8)-l|0;n=m>>>0<d>>>0;d=n?m:d;a=n?c:a;c=f[c+16+(((f[c+16>>2]|0)==0&1)<<2)>>2]|0;if(!c){i=a;h=d;break}else v=61}if((i|0)!=0?h>>>0<((f[5380]|0)-l|0)>>>0:0){g=i+l|0;if(g>>>0<=i>>>0){w=0;u=x;return w|0}e=f[i+24>>2]|0;b=f[i+12>>2]|0;do if((b|0)==(i|0)){a=i+20|0;b=f[a>>2]|0;if(!b){a=i+16|0;b=f[a>>2]|0;if(!b){b=0;break}}while(1){c=b+20|0;d=f[c>>2]|0;if(d|0){b=d;a=c;continue}c=b+16|0;d=f[c>>2]|0;if(!d)break;else{b=d;a=c}}f[a>>2]=0}else{w=f[i+8>>2]|0;f[w+12>>2]=b;f[b+8>>2]=w}while(0);do if(e){a=f[i+28>>2]|0;c=21816+(a<<2)|0;if((i|0)==(f[c>>2]|0)){f[c>>2]=b;if(!b){d=k&~(1<<a);f[5379]=d;break}}else{f[e+16+(((f[e+16>>2]|0)!=(i|0)&1)<<2)>>2]=b;if(!b){d=k;break}}f[b+24>>2]=e;a=f[i+16>>2]|0;if(a|0){f[b+16>>2]=a;f[a+24>>2]=b}a=f[i+20>>2]|0;if(a){f[b+20>>2]=a;f[a+24>>2]=b;d=k}else d=k}else d=k;while(0);do if(h>>>0>=16){f[i+4>>2]=l|3;f[g+4>>2]=h|1;f[g+h>>2]=h;b=h>>>3;if(h>>>0<256){c=21552+(b<<1<<2)|0;a=f[5378]|0;b=1<<b;if(!(a&b)){f[5378]=a|b;b=c;a=c+8|0}else{a=c+8|0;b=f[a>>2]|0}f[a>>2]=g;f[b+12>>2]=g;f[g+8>>2]=b;f[g+12>>2]=c;break}b=h>>>8;if(b)if(h>>>0>16777215)b=31;else{v=(b+1048320|0)>>>16&8;w=b<<v;t=(w+520192|0)>>>16&4;w=w<<t;b=(w+245760|0)>>>16&2;b=14-(t|v|b)+(w<<b>>>15)|0;b=h>>>(b+7|0)&1|b<<1}else b=0;c=21816+(b<<2)|0;f[g+28>>2]=b;a=g+16|0;f[a+4>>2]=0;f[a>>2]=0;a=1<<b;if(!(d&a)){f[5379]=d|a;f[c>>2]=g;f[g+24>>2]=c;f[g+12>>2]=g;f[g+8>>2]=g;break}a=h<<((b|0)==31?0:25-(b>>>1)|0);c=f[c>>2]|0;while(1){if((f[c+4>>2]&-8|0)==(h|0)){v=97;break}d=c+16+(a>>>31<<2)|0;b=f[d>>2]|0;if(!b){v=96;break}else{a=a<<1;c=b}}if((v|0)==96){f[d>>2]=g;f[g+24>>2]=c;f[g+12>>2]=g;f[g+8>>2]=g;break}else if((v|0)==97){v=c+8|0;w=f[v>>2]|0;f[w+12>>2]=g;f[v>>2]=g;f[g+8>>2]=w;f[g+12>>2]=c;f[g+24>>2]=0;break}}else{w=h+l|0;f[i+4>>2]=w|3;w=i+w+4|0;f[w>>2]=f[w>>2]|1}while(0);w=i+8|0;u=x;return w|0}else m=l}else m=l}else m=-1;while(0);c=f[5380]|0;if(c>>>0>=m>>>0){b=c-m|0;a=f[5383]|0;if(b>>>0>15){w=a+m|0;f[5383]=w;f[5380]=b;f[w+4>>2]=b|1;f[a+c>>2]=b;f[a+4>>2]=m|3}else{f[5380]=0;f[5383]=0;f[a+4>>2]=c|3;w=a+c+4|0;f[w>>2]=f[w>>2]|1}w=a+8|0;u=x;return w|0}i=f[5381]|0;if(i>>>0>m>>>0){t=i-m|0;f[5381]=t;w=f[5384]|0;v=w+m|0;f[5384]=v;f[v+4>>2]=t|1;f[w+4>>2]=m|3;w=w+8|0;u=x;return w|0}if(!(f[5496]|0)){f[5498]=4096;f[5497]=4096;f[5499]=-1;f[5500]=-1;f[5501]=0;f[5489]=0;f[5496]=o&-16^1431655768;a=4096}else a=f[5498]|0;j=m+48|0;k=m+47|0;h=a+k|0;e=0-a|0;l=h&e;if(l>>>0<=m>>>0){w=0;u=x;return w|0}a=f[5488]|0;if(a|0?(n=f[5486]|0,o=n+l|0,o>>>0<=n>>>0|o>>>0>a>>>0):0){w=0;u=x;return w|0}b:do if(!(f[5489]&4)){c=f[5384]|0;c:do if(c){d=21960;while(1){a=f[d>>2]|0;if(a>>>0<=c>>>0?(r=d+4|0,(a+(f[r>>2]|0)|0)>>>0>c>>>0):0)break;a=f[d+8>>2]|0;if(!a){v=118;break c}else d=a}b=h-i&e;if(b>>>0<2147483647){a=Wc(b|0)|0;if((a|0)==((f[d>>2]|0)+(f[r>>2]|0)|0)){if((a|0)!=(-1|0)){h=b;g=a;v=135;break b}}else{d=a;v=126}}else b=0}else v=118;while(0);do if((v|0)==118){c=Wc(0)|0;if((c|0)!=(-1|0)?(b=c,p=f[5497]|0,q=p+-1|0,b=((q&b|0)==0?0:(q+b&0-p)-b|0)+l|0,p=f[5486]|0,q=b+p|0,b>>>0>m>>>0&b>>>0<2147483647):0){r=f[5488]|0;if(r|0?q>>>0<=p>>>0|q>>>0>r>>>0:0){b=0;break}a=Wc(b|0)|0;if((a|0)==(c|0)){h=b;g=c;v=135;break b}else{d=a;v=126}}else b=0}while(0);do if((v|0)==126){c=0-b|0;if(!(j>>>0>b>>>0&(b>>>0<2147483647&(d|0)!=(-1|0))))if((d|0)==(-1|0)){b=0;break}else{h=b;g=d;v=135;break b}a=f[5498]|0;a=k-b+a&0-a;if(a>>>0>=2147483647){h=b;g=d;v=135;break b}if((Wc(a|0)|0)==(-1|0)){Wc(c|0)|0;b=0;break}else{h=a+b|0;g=d;v=135;break b}}while(0);f[5489]=f[5489]|4;v=133}else{b=0;v=133}while(0);if(((v|0)==133?l>>>0<2147483647:0)?(g=Wc(l|0)|0,r=Wc(0)|0,s=r-g|0,t=s>>>0>(m+40|0)>>>0,!((g|0)==(-1|0)|t^1|g>>>0<r>>>0&((g|0)!=(-1|0)&(r|0)!=(-1|0))^1)):0){h=t?s:b;v=135}if((v|0)==135){b=(f[5486]|0)+h|0;f[5486]=b;if(b>>>0>(f[5487]|0)>>>0)f[5487]=b;j=f[5384]|0;do if(j){b=21960;while(1){a=f[b>>2]|0;c=b+4|0;d=f[c>>2]|0;if((g|0)==(a+d|0)){v=143;break}e=f[b+8>>2]|0;if(!e)break;else b=e}if(((v|0)==143?(f[b+12>>2]&8|0)==0:0)?g>>>0>j>>>0&a>>>0<=j>>>0:0){f[c>>2]=d+h;w=(f[5381]|0)+h|0;t=j+8|0;t=(t&7|0)==0?0:0-t&7;v=j+t|0;t=w-t|0;f[5384]=v;f[5381]=t;f[v+4>>2]=t|1;f[j+w+4>>2]=40;f[5385]=f[5500];break}if(g>>>0<(f[5382]|0)>>>0)f[5382]=g;a=g+h|0;b=21960;while(1){if((f[b>>2]|0)==(a|0)){v=151;break}b=f[b+8>>2]|0;if(!b){a=21960;break}}if((v|0)==151)if(!(f[b+12>>2]&8)){f[b>>2]=g;l=b+4|0;f[l>>2]=(f[l>>2]|0)+h;l=g+8|0;l=g+((l&7|0)==0?0:0-l&7)|0;b=a+8|0;b=a+((b&7|0)==0?0:0-b&7)|0;k=l+m|0;i=b-l-m|0;f[l+4>>2]=m|3;do if((j|0)!=(b|0)){if((f[5383]|0)==(b|0)){w=(f[5380]|0)+i|0;f[5380]=w;f[5383]=k;f[k+4>>2]=w|1;f[k+w>>2]=w;break}a=f[b+4>>2]|0;if((a&3|0)==1){h=a&-8;d=a>>>3;d:do if(a>>>0<256){a=f[b+8>>2]|0;c=f[b+12>>2]|0;if((c|0)==(a|0)){f[5378]=f[5378]&~(1<<d);break}else{f[a+12>>2]=c;f[c+8>>2]=a;break}}else{g=f[b+24>>2]|0;a=f[b+12>>2]|0;do if((a|0)==(b|0)){d=b+16|0;c=d+4|0;a=f[c>>2]|0;if(!a){a=f[d>>2]|0;if(!a){a=0;break}else c=d}while(1){d=a+20|0;e=f[d>>2]|0;if(e|0){a=e;c=d;continue}d=a+16|0;e=f[d>>2]|0;if(!e)break;else{a=e;c=d}}f[c>>2]=0}else{w=f[b+8>>2]|0;f[w+12>>2]=a;f[a+8>>2]=w}while(0);if(!g)break;c=f[b+28>>2]|0;d=21816+(c<<2)|0;do if((f[d>>2]|0)!=(b|0)){f[g+16+(((f[g+16>>2]|0)!=(b|0)&1)<<2)>>2]=a;if(!a)break d}else{f[d>>2]=a;if(a|0)break;f[5379]=f[5379]&~(1<<c);break d}while(0);f[a+24>>2]=g;c=b+16|0;d=f[c>>2]|0;if(d|0){f[a+16>>2]=d;f[d+24>>2]=a}c=f[c+4>>2]|0;if(!c)break;f[a+20>>2]=c;f[c+24>>2]=a}while(0);b=b+h|0;e=h+i|0}else e=i;b=b+4|0;f[b>>2]=f[b>>2]&-2;f[k+4>>2]=e|1;f[k+e>>2]=e;b=e>>>3;if(e>>>0<256){c=21552+(b<<1<<2)|0;a=f[5378]|0;b=1<<b;if(!(a&b)){f[5378]=a|b;b=c;a=c+8|0}else{a=c+8|0;b=f[a>>2]|0}f[a>>2]=k;f[b+12>>2]=k;f[k+8>>2]=b;f[k+12>>2]=c;break}b=e>>>8;do if(!b)b=0;else{if(e>>>0>16777215){b=31;break}v=(b+1048320|0)>>>16&8;w=b<<v;t=(w+520192|0)>>>16&4;w=w<<t;b=(w+245760|0)>>>16&2;b=14-(t|v|b)+(w<<b>>>15)|0;b=e>>>(b+7|0)&1|b<<1}while(0);d=21816+(b<<2)|0;f[k+28>>2]=b;a=k+16|0;f[a+4>>2]=0;f[a>>2]=0;a=f[5379]|0;c=1<<b;if(!(a&c)){f[5379]=a|c;f[d>>2]=k;f[k+24>>2]=d;f[k+12>>2]=k;f[k+8>>2]=k;break}a=e<<((b|0)==31?0:25-(b>>>1)|0);c=f[d>>2]|0;while(1){if((f[c+4>>2]&-8|0)==(e|0)){v=192;break}d=c+16+(a>>>31<<2)|0;b=f[d>>2]|0;if(!b){v=191;break}else{a=a<<1;c=b}}if((v|0)==191){f[d>>2]=k;f[k+24>>2]=c;f[k+12>>2]=k;f[k+8>>2]=k;break}else if((v|0)==192){v=c+8|0;w=f[v>>2]|0;f[w+12>>2]=k;f[v>>2]=k;f[k+8>>2]=w;f[k+12>>2]=c;f[k+24>>2]=0;break}}else{w=(f[5381]|0)+i|0;f[5381]=w;f[5384]=k;f[k+4>>2]=w|1}while(0);w=l+8|0;u=x;return w|0}else a=21960;while(1){b=f[a>>2]|0;if(b>>>0<=j>>>0?(w=b+(f[a+4>>2]|0)|0,w>>>0>j>>>0):0)break;a=f[a+8>>2]|0}e=w+-47|0;a=e+8|0;a=e+((a&7|0)==0?0:0-a&7)|0;e=j+16|0;a=a>>>0<e>>>0?j:a;b=a+8|0;c=h+-40|0;t=g+8|0;t=(t&7|0)==0?0:0-t&7;v=g+t|0;t=c-t|0;f[5384]=v;f[5381]=t;f[v+4>>2]=t|1;f[g+c+4>>2]=40;f[5385]=f[5500];c=a+4|0;f[c>>2]=27;f[b>>2]=f[5490];f[b+4>>2]=f[5491];f[b+8>>2]=f[5492];f[b+12>>2]=f[5493];f[5490]=g;f[5491]=h;f[5493]=0;f[5492]=b;b=a+24|0;do{v=b;b=b+4|0;f[b>>2]=7}while((v+8|0)>>>0<w>>>0);if((a|0)!=(j|0)){g=a-j|0;f[c>>2]=f[c>>2]&-2;f[j+4>>2]=g|1;f[a>>2]=g;b=g>>>3;if(g>>>0<256){c=21552+(b<<1<<2)|0;a=f[5378]|0;b=1<<b;if(!(a&b)){f[5378]=a|b;b=c;a=c+8|0}else{a=c+8|0;b=f[a>>2]|0}f[a>>2]=j;f[b+12>>2]=j;f[j+8>>2]=b;f[j+12>>2]=c;break}b=g>>>8;if(b)if(g>>>0>16777215)c=31;else{v=(b+1048320|0)>>>16&8;w=b<<v;t=(w+520192|0)>>>16&4;w=w<<t;c=(w+245760|0)>>>16&2;c=14-(t|v|c)+(w<<c>>>15)|0;c=g>>>(c+7|0)&1|c<<1}else c=0;d=21816+(c<<2)|0;f[j+28>>2]=c;f[j+20>>2]=0;f[e>>2]=0;b=f[5379]|0;a=1<<c;if(!(b&a)){f[5379]=b|a;f[d>>2]=j;f[j+24>>2]=d;f[j+12>>2]=j;f[j+8>>2]=j;break}a=g<<((c|0)==31?0:25-(c>>>1)|0);c=f[d>>2]|0;while(1){if((f[c+4>>2]&-8|0)==(g|0)){v=213;break}d=c+16+(a>>>31<<2)|0;b=f[d>>2]|0;if(!b){v=212;break}else{a=a<<1;c=b}}if((v|0)==212){f[d>>2]=j;f[j+24>>2]=c;f[j+12>>2]=j;f[j+8>>2]=j;break}else if((v|0)==213){v=c+8|0;w=f[v>>2]|0;f[w+12>>2]=j;f[v>>2]=j;f[j+8>>2]=w;f[j+12>>2]=c;f[j+24>>2]=0;break}}}else{w=f[5382]|0;if((w|0)==0|g>>>0<w>>>0)f[5382]=g;f[5490]=g;f[5491]=h;f[5493]=0;f[5387]=f[5496];f[5386]=-1;f[5391]=21552;f[5390]=21552;f[5393]=21560;f[5392]=21560;f[5395]=21568;f[5394]=21568;f[5397]=21576;f[5396]=21576;f[5399]=21584;f[5398]=21584;f[5401]=21592;f[5400]=21592;f[5403]=21600;f[5402]=21600;f[5405]=21608;f[5404]=21608;f[5407]=21616;f[5406]=21616;f[5409]=21624;f[5408]=21624;f[5411]=21632;f[5410]=21632;f[5413]=21640;f[5412]=21640;f[5415]=21648;f[5414]=21648;f[5417]=21656;f[5416]=21656;f[5419]=21664;f[5418]=21664;f[5421]=21672;f[5420]=21672;f[5423]=21680;f[5422]=21680;f[5425]=21688;f[5424]=21688;f[5427]=21696;f[5426]=21696;f[5429]=21704;f[5428]=21704;f[5431]=21712;f[5430]=21712;f[5433]=21720;f[5432]=21720;f[5435]=21728;f[5434]=21728;f[5437]=21736;f[5436]=21736;f[5439]=21744;f[5438]=21744;f[5441]=21752;f[5440]=21752;f[5443]=21760;f[5442]=21760;f[5445]=21768;f[5444]=21768;f[5447]=21776;f[5446]=21776;f[5449]=21784;f[5448]=21784;f[5451]=21792;f[5450]=21792;f[5453]=21800;f[5452]=21800;w=h+-40|0;t=g+8|0;t=(t&7|0)==0?0:0-t&7;v=g+t|0;t=w-t|0;f[5384]=v;f[5381]=t;f[v+4>>2]=t|1;f[g+w+4>>2]=40;f[5385]=f[5500]}while(0);b=f[5381]|0;if(b>>>0>m>>>0){t=b-m|0;f[5381]=t;w=f[5384]|0;v=w+m|0;f[5384]=v;f[v+4>>2]=t|1;f[w+4>>2]=m|3;w=w+8|0;u=x;return w|0}}w=Ec()|0;f[w>>2]=12;w=0;u=x;return w|0}function Cc(a){a=a|0;var b=0,c=0,d=0,e=0,g=0,h=0,i=0,j=0;if(!a)return;c=a+-8|0;e=f[5382]|0;a=f[a+-4>>2]|0;b=a&-8;j=c+b|0;do if(!(a&1)){d=f[c>>2]|0;if(!(a&3))return;h=c+(0-d)|0;g=d+b|0;if(h>>>0<e>>>0)return;if((f[5383]|0)==(h|0)){a=j+4|0;b=f[a>>2]|0;if((b&3|0)!=3){i=h;b=g;break}f[5380]=g;f[a>>2]=b&-2;f[h+4>>2]=g|1;f[h+g>>2]=g;return}c=d>>>3;if(d>>>0<256){a=f[h+8>>2]|0;b=f[h+12>>2]|0;if((b|0)==(a|0)){f[5378]=f[5378]&~(1<<c);i=h;b=g;break}else{f[a+12>>2]=b;f[b+8>>2]=a;i=h;b=g;break}}e=f[h+24>>2]|0;a=f[h+12>>2]|0;do if((a|0)==(h|0)){c=h+16|0;b=c+4|0;a=f[b>>2]|0;if(!a){a=f[c>>2]|0;if(!a){a=0;break}else b=c}while(1){c=a+20|0;d=f[c>>2]|0;if(d|0){a=d;b=c;continue}c=a+16|0;d=f[c>>2]|0;if(!d)break;else{a=d;b=c}}f[b>>2]=0}else{i=f[h+8>>2]|0;f[i+12>>2]=a;f[a+8>>2]=i}while(0);if(e){b=f[h+28>>2]|0;c=21816+(b<<2)|0;if((f[c>>2]|0)==(h|0)){f[c>>2]=a;if(!a){f[5379]=f[5379]&~(1<<b);i=h;b=g;break}}else{f[e+16+(((f[e+16>>2]|0)!=(h|0)&1)<<2)>>2]=a;if(!a){i=h;b=g;break}}f[a+24>>2]=e;b=h+16|0;c=f[b>>2]|0;if(c|0){f[a+16>>2]=c;f[c+24>>2]=a}b=f[b+4>>2]|0;if(b){f[a+20>>2]=b;f[b+24>>2]=a;i=h;b=g}else{i=h;b=g}}else{i=h;b=g}}else{i=c;h=c}while(0);if(h>>>0>=j>>>0)return;a=j+4|0;d=f[a>>2]|0;if(!(d&1))return;if(!(d&2)){if((f[5384]|0)==(j|0)){j=(f[5381]|0)+b|0;f[5381]=j;f[5384]=i;f[i+4>>2]=j|1;if((i|0)!=(f[5383]|0))return;f[5383]=0;f[5380]=0;return}if((f[5383]|0)==(j|0)){j=(f[5380]|0)+b|0;f[5380]=j;f[5383]=h;f[i+4>>2]=j|1;f[h+j>>2]=j;return}e=(d&-8)+b|0;c=d>>>3;do if(d>>>0<256){b=f[j+8>>2]|0;a=f[j+12>>2]|0;if((a|0)==(b|0)){f[5378]=f[5378]&~(1<<c);break}else{f[b+12>>2]=a;f[a+8>>2]=b;break}}else{g=f[j+24>>2]|0;a=f[j+12>>2]|0;do if((a|0)==(j|0)){c=j+16|0;b=c+4|0;a=f[b>>2]|0;if(!a){a=f[c>>2]|0;if(!a){c=0;break}else b=c}while(1){c=a+20|0;d=f[c>>2]|0;if(d|0){a=d;b=c;continue}c=a+16|0;d=f[c>>2]|0;if(!d)break;else{a=d;b=c}}f[b>>2]=0;c=a}else{c=f[j+8>>2]|0;f[c+12>>2]=a;f[a+8>>2]=c;c=a}while(0);if(g|0){a=f[j+28>>2]|0;b=21816+(a<<2)|0;if((f[b>>2]|0)==(j|0)){f[b>>2]=c;if(!c){f[5379]=f[5379]&~(1<<a);break}}else{f[g+16+(((f[g+16>>2]|0)!=(j|0)&1)<<2)>>2]=c;if(!c)break}f[c+24>>2]=g;a=j+16|0;b=f[a>>2]|0;if(b|0){f[c+16>>2]=b;f[b+24>>2]=c}a=f[a+4>>2]|0;if(a|0){f[c+20>>2]=a;f[a+24>>2]=c}}}while(0);f[i+4>>2]=e|1;f[h+e>>2]=e;if((i|0)==(f[5383]|0)){f[5380]=e;return}}else{f[a>>2]=d&-2;f[i+4>>2]=b|1;f[h+b>>2]=b;e=b}a=e>>>3;if(e>>>0<256){c=21552+(a<<1<<2)|0;b=f[5378]|0;a=1<<a;if(!(b&a)){f[5378]=b|a;a=c;b=c+8|0}else{b=c+8|0;a=f[b>>2]|0}f[b>>2]=i;f[a+12>>2]=i;f[i+8>>2]=a;f[i+12>>2]=c;return}a=e>>>8;if(a)if(e>>>0>16777215)a=31;else{h=(a+1048320|0)>>>16&8;j=a<<h;g=(j+520192|0)>>>16&4;j=j<<g;a=(j+245760|0)>>>16&2;a=14-(g|h|a)+(j<<a>>>15)|0;a=e>>>(a+7|0)&1|a<<1}else a=0;d=21816+(a<<2)|0;f[i+28>>2]=a;f[i+20>>2]=0;f[i+16>>2]=0;b=f[5379]|0;c=1<<a;do if(b&c){b=e<<((a|0)==31?0:25-(a>>>1)|0);c=f[d>>2]|0;while(1){if((f[c+4>>2]&-8|0)==(e|0)){a=73;break}d=c+16+(b>>>31<<2)|0;a=f[d>>2]|0;if(!a){a=72;break}else{b=b<<1;c=a}}if((a|0)==72){f[d>>2]=i;f[i+24>>2]=c;f[i+12>>2]=i;f[i+8>>2]=i;break}else if((a|0)==73){h=c+8|0;j=f[h>>2]|0;f[j+12>>2]=i;f[h>>2]=i;f[i+8>>2]=j;f[i+12>>2]=c;f[i+24>>2]=0;break}}else{f[5379]=b|c;f[d>>2]=i;f[i+24>>2]=d;f[i+12>>2]=i;f[i+8>>2]=i}while(0);j=(f[5386]|0)+-1|0;f[5386]=j;if(!j)a=21968;else return;while(1){a=f[a>>2]|0;if(!a)break;else a=a+8|0}f[5386]=-1;return}function Dc(a,b){a=a|0;b=b|0;var c=0;if(a){c=X(b,a)|0;if((b|a)>>>0>65535)c=((c>>>0)/(a>>>0)|0|0)==(b|0)?c:-1}else c=0;a=Bc(c)|0;if(!a)return a|0;if(!(f[a+-4>>2]&3))return a|0;Uc(a|0,0,c|0)|0;return a|0}function Ec(){return 22008}function Fc(a,b){a=+a;b=+b;var c=0,d=0,e=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0;p[s>>3]=a;h=f[s>>2]|0;j=f[s+4>>2]|0;p[s>>3]=b;l=f[s>>2]|0;m=f[s+4>>2]|0;d=Rc(h|0,j|0,52)|0;d=d&2047;k=Rc(l|0,m|0,52)|0;k=k&2047;n=j&-2147483648;g=Sc(l|0,m|0,1)|0;i=I;a:do if(!((g|0)==0&(i|0)==0)?(e=Gc(b)|0,c=I&2147483647,!((d|0)==2047|(c>>>0>2146435072|(c|0)==2146435072&e>>>0>0))):0){c=Sc(h|0,j|0,1)|0;e=I;if(!(e>>>0>i>>>0|(e|0)==(i|0)&c>>>0>g>>>0))return +((c|0)==(g|0)&(e|0)==(i|0)?a*0.0:a);if(!d){c=Sc(h|0,j|0,12)|0;e=I;if((e|0)>-1|(e|0)==-1&c>>>0>4294967295){d=0;do{d=d+-1|0;c=Sc(c|0,e|0,1)|0;e=I}while((e|0)>-1|(e|0)==-1&c>>>0>4294967295)}else d=0;h=Sc(h|0,j|0,1-d|0)|0;g=I}else g=j&1048575|1048576;if(!k){e=Sc(l|0,m|0,12)|0;i=I;if((i|0)>-1|(i|0)==-1&e>>>0>4294967295){c=0;do{c=c+-1|0;e=Sc(e|0,i|0,1)|0;i=I}while((i|0)>-1|(i|0)==-1&e>>>0>4294967295)}else c=0;l=Sc(l|0,m|0,1-c|0)|0;k=c;j=I}else j=m&1048575|1048576;e=Nc(h|0,g|0,l|0,j|0)|0;c=I;i=(c|0)>-1|(c|0)==-1&e>>>0>4294967295;b:do if((d|0)>(k|0)){while(1){if(i){if((e|0)==0&(c|0)==0)break}else{e=h;c=g}h=Sc(e|0,c|0,1)|0;g=I;d=d+-1|0;e=Nc(h|0,g|0,l|0,j|0)|0;c=I;i=(c|0)>-1|(c|0)==-1&e>>>0>4294967295;if((d|0)<=(k|0))break b}b=a*0.0;break a}while(0);if(i){if((e|0)==0&(c|0)==0){b=a*0.0;break}}else{c=g;e=h}if(c>>>0<1048576|(c|0)==1048576&e>>>0<0)do{e=Sc(e|0,c|0,1)|0;c=I;d=d+-1|0}while(c>>>0<1048576|(c|0)==1048576&e>>>0<0);if((d|0)>0){m=Mc(e|0,c|0,0,-1048576)|0;c=I;d=Sc(d|0,0,52)|0;c=c|I;d=m|d}else{d=Rc(e|0,c|0,1-d|0)|0;c=I}f[s>>2]=d;f[s+4>>2]=c|n;b=+p[s>>3]}else o=3;while(0);if((o|0)==3){b=a*b;b=b/b}return +b}function Gc(a){a=+a;var b=0;p[s>>3]=a;b=f[s>>2]|0;I=f[s+4>>2]|0;return b|0}function Hc(a){a=+a;return ~~+Ic(a)|0}function Ic(a){a=+a;return +(+Vc(+a))}function Jc(){}function Kc(a,b){a=a|0;b=b|0;var c=0,d=0,e=0,f=0;f=a&65535;e=b&65535;c=X(e,f)|0;d=a>>>16;a=(c>>>16)+(X(e,d)|0)|0;e=b>>>16;b=X(e,f)|0;return (I=(a>>>16)+(X(e,d)|0)+(((a&65535)+b|0)>>>16)|0,a+b<<16|c&65535|0)|0}function Lc(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;var e=0,f=0;e=a;f=c;c=Kc(e,f)|0;a=I;return (I=(X(b,f)|0)+(X(d,e)|0)+a|a&0,c|0|0)|0}function Mc(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;c=a+c>>>0;return (I=b+d+(c>>>0<a>>>0|0)>>>0,c|0)|0}function Nc(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;d=b-d-(c>>>0>a>>>0|0)>>>0;return (I=d,a-c>>>0|0)|0}function Oc(a){a=a|0;var c=0;c=b[w+(a&255)>>0]|0;if((c|0)<8)return c|0;c=b[w+(a>>8&255)>>0]|0;if((c|0)<8)return c+8|0;c=b[w+(a>>16&255)>>0]|0;if((c|0)<8)return c+16|0;return (b[w+(a>>>24)>>0]|0)+24|0}function Pc(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;var g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0;l=a;j=b;k=j;h=c;n=d;i=n;if(!k){g=(e|0)!=0;if(!i){if(g){f[e>>2]=(l>>>0)%(h>>>0);f[e+4>>2]=0}n=0;e=(l>>>0)/(h>>>0)>>>0;return (I=n,e)|0}else{if(!g){n=0;e=0;return (I=n,e)|0}f[e>>2]=a|0;f[e+4>>2]=b&0;n=0;e=0;return (I=n,e)|0}}g=(i|0)==0;do if(h){if(!g){g=(_(i|0)|0)-(_(k|0)|0)|0;if(g>>>0<=31){m=g+1|0;i=31-g|0;b=g-31>>31;h=m;a=l>>>(m>>>0)&b|k<<i;b=k>>>(m>>>0)&b;g=0;i=l<<i;break}if(!e){n=0;e=0;return (I=n,e)|0}f[e>>2]=a|0;f[e+4>>2]=j|b&0;n=0;e=0;return (I=n,e)|0}g=h-1|0;if(g&h|0){i=(_(h|0)|0)+33-(_(k|0)|0)|0;p=64-i|0;m=32-i|0;j=m>>31;o=i-32|0;b=o>>31;h=i;a=m-1>>31&k>>>(o>>>0)|(k<<m|l>>>(i>>>0))&b;b=b&k>>>(i>>>0);g=l<<p&j;i=(k<<p|l>>>(o>>>0))&j|l<<m&i-33>>31;break}if(e|0){f[e>>2]=g&l;f[e+4>>2]=0}if((h|0)==1){o=j|b&0;p=a|0|0;return (I=o,p)|0}else{p=Oc(h|0)|0;o=k>>>(p>>>0)|0;p=k<<32-p|l>>>(p>>>0)|0;return (I=o,p)|0}}else{if(g){if(e|0){f[e>>2]=(k>>>0)%(h>>>0);f[e+4>>2]=0}o=0;p=(k>>>0)/(h>>>0)>>>0;return (I=o,p)|0}if(!l){if(e|0){f[e>>2]=0;f[e+4>>2]=(k>>>0)%(i>>>0)}o=0;p=(k>>>0)/(i>>>0)>>>0;return (I=o,p)|0}g=i-1|0;if(!(g&i)){if(e|0){f[e>>2]=a|0;f[e+4>>2]=g&k|b&0}o=0;p=k>>>((Oc(i|0)|0)>>>0);return (I=o,p)|0}g=(_(i|0)|0)-(_(k|0)|0)|0;if(g>>>0<=30){b=g+1|0;i=31-g|0;h=b;a=k<<i|l>>>(b>>>0);b=k>>>(b>>>0);g=0;i=l<<i;break}if(!e){o=0;p=0;return (I=o,p)|0}f[e>>2]=a|0;f[e+4>>2]=j|b&0;o=0;p=0;return (I=o,p)|0}while(0);if(!h){k=i;j=0;i=0}else{m=c|0|0;l=n|d&0;k=Mc(m|0,l|0,-1,-1)|0;c=I;j=i;i=0;do{d=j;j=g>>>31|j<<1;g=i|g<<1;d=a<<1|d>>>31|0;n=a>>>31|b<<1|0;Nc(k|0,c|0,d|0,n|0)|0;p=I;o=p>>31|((p|0)<0?-1:0)<<1;i=o&1;a=Nc(d|0,n|0,o&m|0,(((p|0)<0?-1:0)>>31|((p|0)<0?-1:0)<<1)&l|0)|0;b=I;h=h-1|0}while((h|0)!=0);k=j;j=0}h=0;if(e|0){f[e>>2]=a;f[e+4>>2]=b}o=(g|0)>>>31|(k|h)<<1|(h<<1|g>>>31)&0|j;p=(g<<1|0>>>31)&-2|i;return (I=o,p)|0}function Qc(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;var e=0,g=0;g=u;u=u+16|0;e=g|0;Pc(a,b,c,d,e)|0;u=g;return (I=f[e+4>>2]|0,f[e>>2]|0)|0}function Rc(a,b,c){a=a|0;b=b|0;c=c|0;if((c|0)<32){I=b>>>c;return a>>>c|(b&(1<<c)-1)<<32-c}I=0;return b>>>c-32|0}function Sc(a,b,c){a=a|0;b=b|0;c=c|0;if((c|0)<32){I=b<<c|(a&(1<<c)-1<<32-c)>>>32-c;return a<<c}I=a<<c-32;return 0}function Tc(a,c,d){a=a|0;c=c|0;d=d|0;var e=0,g=0,h=0;if((d|0)>=8192)return ga(a|0,c|0,d|0)|0;h=a|0;g=a+d|0;if((a&3)==(c&3)){while(a&3){if(!d)return h|0;b[a>>0]=b[c>>0]|0;a=a+1|0;c=c+1|0;d=d-1|0}d=g&-4|0;e=d-64|0;while((a|0)<=(e|0)){f[a>>2]=f[c>>2];f[a+4>>2]=f[c+4>>2];f[a+8>>2]=f[c+8>>2];f[a+12>>2]=f[c+12>>2];f[a+16>>2]=f[c+16>>2];f[a+20>>2]=f[c+20>>2];f[a+24>>2]=f[c+24>>2];f[a+28>>2]=f[c+28>>2];f[a+32>>2]=f[c+32>>2];f[a+36>>2]=f[c+36>>2];f[a+40>>2]=f[c+40>>2];f[a+44>>2]=f[c+44>>2];f[a+48>>2]=f[c+48>>2];f[a+52>>2]=f[c+52>>2];f[a+56>>2]=f[c+56>>2];f[a+60>>2]=f[c+60>>2];a=a+64|0;c=c+64|0}while((a|0)<(d|0)){f[a>>2]=f[c>>2];a=a+4|0;c=c+4|0}}else{d=g-4|0;while((a|0)<(d|0)){b[a>>0]=b[c>>0]|0;b[a+1>>0]=b[c+1>>0]|0;b[a+2>>0]=b[c+2>>0]|0;b[a+3>>0]=b[c+3>>0]|0;a=a+4|0;c=c+4|0}}while((a|0)<(g|0)){b[a>>0]=b[c>>0]|0;a=a+1|0;c=c+1|0}return h|0}function Uc(a,c,d){a=a|0;c=c|0;d=d|0;var e=0,g=0,h=0,i=0;h=a+d|0;c=c&255;if((d|0)>=67){while(a&3){b[a>>0]=c;a=a+1|0}e=h&-4|0;g=e-64|0;i=c|c<<8|c<<16|c<<24;while((a|0)<=(g|0)){f[a>>2]=i;f[a+4>>2]=i;f[a+8>>2]=i;f[a+12>>2]=i;f[a+16>>2]=i;f[a+20>>2]=i;f[a+24>>2]=i;f[a+28>>2]=i;f[a+32>>2]=i;f[a+36>>2]=i;f[a+40>>2]=i;f[a+44>>2]=i;f[a+48>>2]=i;f[a+52>>2]=i;f[a+56>>2]=i;f[a+60>>2]=i;a=a+64|0}while((a|0)<(e|0)){f[a>>2]=i;a=a+4|0}}while((a|0)<(h|0)){b[a>>0]=c;a=a+1|0}return h-d|0}function Vc(a){a=+a;return a>=0.0?+J(a+.5):+W(a-.5)}function Wc(a){a=a|0;var b=0,c=0;c=f[r>>2]|0;b=c+a|0;if((a|0)>0&(b|0)<(c|0)|(b|0)<0){da()|0;fa(12);return -1}f[r>>2]=b;if((b|0)>(ca()|0)?(ba()|0)==0:0){f[r>>2]=c;fa(12);return -1}return c|0}

// EMSCRIPTEN_END_FUNCS
return{___muldi3:Lc,___uremdi3:Qc,_bitshift64Lshr:Rc,_bitshift64Shl:Sc,_calloc:Dc,_compact:Jb,_destroyLinkedPolygon:hc,_edgeLengthKm:Ab,_edgeLengthM:Bb,_emscripten_replace_memory:na,_free:Cc,_geoToH3:Tb,_getDestinationH3IndexFromUnidirectionalEdge:$b,_getH3IndexesFromUnidirectionalEdge:bc,_getH3UnidirectionalEdge:Zb,_getH3UnidirectionalEdgeBoundary:dc,_getH3UnidirectionalEdgesFromHexagon:cc,_getOriginH3IndexFromUnidirectionalEdge:_b,_h3GetBaseCell:Db,_h3IndexesAreNeighbors:Yb,_h3IsPentagon:Ib,_h3IsResClassIII:Mb,_h3IsValid:Eb,_h3SetToLinkedGeo:Ha,_h3ToChildren:Hb,_h3ToGeo:Wb,_h3ToGeoBoundary:Xb,_h3ToParent:Fb,_h3UnidirectionalEdgeIsValid:ac,_hexAreaKm2:yb,_hexAreaM2:zb,_hexRing:Ba,_i64Add:Mc,_i64Subtract:Nc,_kRing:wa,_kRingDistances:xa,_malloc:Bc,_maxH3ToChildrenSize:Gb,_maxKringSize:va,_maxPolyfillSize:Ca,_maxUncompactSize:Lb,_memcpy:Tc,_memset:Uc,_numHexagons:Cb,_polyfill:Ea,_round:Vc,_sbrk:Wc,_sizeOfGeoBoundary:lc,_sizeOfGeoCoord:kc,_sizeOfGeoPolygon:nc,_sizeOfGeofence:mc,_sizeOfH3Index:jc,_sizeOfLinkedGeoPolygon:oc,_uncompact:Kb,establishStackSpace:ra,getTempRet0:ua,runPostSets:Jc,setTempRet0:ta,setThrew:sa,stackAlloc:oa,stackRestore:qa,stackSave:pa}})


// EMSCRIPTEN_END_ASM
(Module.asmGlobalArg,Module.asmLibraryArg,buffer);var ___muldi3=Module["___muldi3"]=asm["___muldi3"];var ___uremdi3=Module["___uremdi3"]=asm["___uremdi3"];var _bitshift64Lshr=Module["_bitshift64Lshr"]=asm["_bitshift64Lshr"];var _bitshift64Shl=Module["_bitshift64Shl"]=asm["_bitshift64Shl"];var _calloc=Module["_calloc"]=asm["_calloc"];var _compact=Module["_compact"]=asm["_compact"];var _destroyLinkedPolygon=Module["_destroyLinkedPolygon"]=asm["_destroyLinkedPolygon"];var _edgeLengthKm=Module["_edgeLengthKm"]=asm["_edgeLengthKm"];var _edgeLengthM=Module["_edgeLengthM"]=asm["_edgeLengthM"];var _emscripten_replace_memory=Module["_emscripten_replace_memory"]=asm["_emscripten_replace_memory"];var _free=Module["_free"]=asm["_free"];var _geoToH3=Module["_geoToH3"]=asm["_geoToH3"];var _getDestinationH3IndexFromUnidirectionalEdge=Module["_getDestinationH3IndexFromUnidirectionalEdge"]=asm["_getDestinationH3IndexFromUnidirectionalEdge"];var _getH3IndexesFromUnidirectionalEdge=Module["_getH3IndexesFromUnidirectionalEdge"]=asm["_getH3IndexesFromUnidirectionalEdge"];var _getH3UnidirectionalEdge=Module["_getH3UnidirectionalEdge"]=asm["_getH3UnidirectionalEdge"];var _getH3UnidirectionalEdgeBoundary=Module["_getH3UnidirectionalEdgeBoundary"]=asm["_getH3UnidirectionalEdgeBoundary"];var _getH3UnidirectionalEdgesFromHexagon=Module["_getH3UnidirectionalEdgesFromHexagon"]=asm["_getH3UnidirectionalEdgesFromHexagon"];var _getOriginH3IndexFromUnidirectionalEdge=Module["_getOriginH3IndexFromUnidirectionalEdge"]=asm["_getOriginH3IndexFromUnidirectionalEdge"];var _h3GetBaseCell=Module["_h3GetBaseCell"]=asm["_h3GetBaseCell"];var _h3IndexesAreNeighbors=Module["_h3IndexesAreNeighbors"]=asm["_h3IndexesAreNeighbors"];var _h3IsPentagon=Module["_h3IsPentagon"]=asm["_h3IsPentagon"];var _h3IsResClassIII=Module["_h3IsResClassIII"]=asm["_h3IsResClassIII"];var _h3IsValid=Module["_h3IsValid"]=asm["_h3IsValid"];var _h3SetToLinkedGeo=Module["_h3SetToLinkedGeo"]=asm["_h3SetToLinkedGeo"];var _h3ToChildren=Module["_h3ToChildren"]=asm["_h3ToChildren"];var _h3ToGeo=Module["_h3ToGeo"]=asm["_h3ToGeo"];var _h3ToGeoBoundary=Module["_h3ToGeoBoundary"]=asm["_h3ToGeoBoundary"];var _h3ToParent=Module["_h3ToParent"]=asm["_h3ToParent"];var _h3UnidirectionalEdgeIsValid=Module["_h3UnidirectionalEdgeIsValid"]=asm["_h3UnidirectionalEdgeIsValid"];var _hexAreaKm2=Module["_hexAreaKm2"]=asm["_hexAreaKm2"];var _hexAreaM2=Module["_hexAreaM2"]=asm["_hexAreaM2"];var _hexRing=Module["_hexRing"]=asm["_hexRing"];var _i64Add=Module["_i64Add"]=asm["_i64Add"];var _i64Subtract=Module["_i64Subtract"]=asm["_i64Subtract"];var _kRing=Module["_kRing"]=asm["_kRing"];var _kRingDistances=Module["_kRingDistances"]=asm["_kRingDistances"];var _malloc=Module["_malloc"]=asm["_malloc"];var _maxH3ToChildrenSize=Module["_maxH3ToChildrenSize"]=asm["_maxH3ToChildrenSize"];var _maxKringSize=Module["_maxKringSize"]=asm["_maxKringSize"];var _maxPolyfillSize=Module["_maxPolyfillSize"]=asm["_maxPolyfillSize"];var _maxUncompactSize=Module["_maxUncompactSize"]=asm["_maxUncompactSize"];var _memcpy=Module["_memcpy"]=asm["_memcpy"];var _memset=Module["_memset"]=asm["_memset"];var _numHexagons=Module["_numHexagons"]=asm["_numHexagons"];var _polyfill=Module["_polyfill"]=asm["_polyfill"];var _round=Module["_round"]=asm["_round"];var _sbrk=Module["_sbrk"]=asm["_sbrk"];var _sizeOfGeoBoundary=Module["_sizeOfGeoBoundary"]=asm["_sizeOfGeoBoundary"];var _sizeOfGeoCoord=Module["_sizeOfGeoCoord"]=asm["_sizeOfGeoCoord"];var _sizeOfGeoPolygon=Module["_sizeOfGeoPolygon"]=asm["_sizeOfGeoPolygon"];var _sizeOfGeofence=Module["_sizeOfGeofence"]=asm["_sizeOfGeofence"];var _sizeOfH3Index=Module["_sizeOfH3Index"]=asm["_sizeOfH3Index"];var _sizeOfLinkedGeoPolygon=Module["_sizeOfLinkedGeoPolygon"]=asm["_sizeOfLinkedGeoPolygon"];var _uncompact=Module["_uncompact"]=asm["_uncompact"];var establishStackSpace=Module["establishStackSpace"]=asm["establishStackSpace"];var getTempRet0=Module["getTempRet0"]=asm["getTempRet0"];var runPostSets=Module["runPostSets"]=asm["runPostSets"];var setTempRet0=Module["setTempRet0"]=asm["setTempRet0"];var setThrew=Module["setThrew"]=asm["setThrew"];var stackAlloc=Module["stackAlloc"]=asm["stackAlloc"];var stackRestore=Module["stackRestore"]=asm["stackRestore"];var stackSave=Module["stackSave"]=asm["stackSave"];Module["asm"]=asm;Module["cwrap"]=cwrap;Module["setValue"]=setValue;Module["getValue"]=getValue;if(memoryInitializer){if(!isDataURI(memoryInitializer)){if(typeof Module["locateFile"]==="function"){memoryInitializer=Module["locateFile"](memoryInitializer)}else if(Module["memoryInitializerPrefixURL"]){memoryInitializer=Module["memoryInitializerPrefixURL"]+memoryInitializer}}if(ENVIRONMENT_IS_NODE||ENVIRONMENT_IS_SHELL){var data=Module["readBinary"](memoryInitializer);HEAPU8.set(data,GLOBAL_BASE)}else{addRunDependency("memory initializer");var applyMemoryInitializer=(function(data){if(data.byteLength)data=new Uint8Array(data);HEAPU8.set(data,GLOBAL_BASE);if(Module["memoryInitializerRequest"])delete Module["memoryInitializerRequest"].response;removeRunDependency("memory initializer")});function doBrowserLoad(){Module["readAsync"](memoryInitializer,applyMemoryInitializer,(function(){throw"could not load memory initializer "+memoryInitializer}))}var memoryInitializerBytes=tryParseAsDataURI(memoryInitializer);if(memoryInitializerBytes){applyMemoryInitializer(memoryInitializerBytes.buffer)}else if(Module["memoryInitializerRequest"]){function useRequest(){var request=Module["memoryInitializerRequest"];var response=request.response;if(request.status!==200&&request.status!==0){var data=tryParseAsDataURI(Module["memoryInitializerRequestURL"]);if(data){response=data.buffer}else{console.warn("a problem seems to have happened with Module.memoryInitializerRequest, status: "+request.status+", retrying "+memoryInitializer);doBrowserLoad();return}}applyMemoryInitializer(response)}if(Module["memoryInitializerRequest"].response){setTimeout(useRequest,0)}else{Module["memoryInitializerRequest"].addEventListener("load",useRequest)}}else{doBrowserLoad()}}}Module["then"]=(function(func){if(Module["calledRun"]){func(Module)}else{var old=Module["onRuntimeInitialized"];Module["onRuntimeInitialized"]=(function(){if(old)old();func(Module)})}return Module});function ExitStatus(status){this.name="ExitStatus";this.message="Program terminated with exit("+status+")";this.status=status}ExitStatus.prototype=new Error;ExitStatus.prototype.constructor=ExitStatus;var initialStackTop;dependenciesFulfilled=function runCaller(){if(!Module["calledRun"])run();if(!Module["calledRun"])dependenciesFulfilled=runCaller};function run(args){args=args||Module["arguments"];if(runDependencies>0){return}preRun();if(runDependencies>0)return;if(Module["calledRun"])return;function doRun(){if(Module["calledRun"])return;Module["calledRun"]=true;if(ABORT)return;ensureInitRuntime();preMain();if(Module["onRuntimeInitialized"])Module["onRuntimeInitialized"]();postRun()}if(Module["setStatus"]){Module["setStatus"]("Running...");setTimeout((function(){setTimeout((function(){Module["setStatus"]("")}),1);doRun()}),1)}else{doRun()}}Module["run"]=run;function exit(status,implicit){if(implicit&&Module["noExitRuntime"]&&status===0){return}if(Module["noExitRuntime"]){}else{ABORT=true;EXITSTATUS=status;STACKTOP=initialStackTop;exitRuntime();if(Module["onExit"])Module["onExit"](status)}if(ENVIRONMENT_IS_NODE){process["exit"](status)}Module["quit"](status,new ExitStatus(status))}Module["exit"]=exit;function abort(what){if(Module["onAbort"]){Module["onAbort"](what)}if(what!==undefined){Module.print(what);Module.printErr(what);what=JSON.stringify(what)}else{what=""}ABORT=true;EXITSTATUS=1;throw"abort("+what+"). Build with -s ASSERTIONS=1 for more info."}Module["abort"]=abort;if(Module["preInit"]){if(typeof Module["preInit"]=="function")Module["preInit"]=[Module["preInit"]];while(Module["preInit"].length>0){Module["preInit"].pop()()}}Module["noExitRuntime"]=true;run()






  return libh3;
};
if (typeof exports === 'object' && typeof module === 'object')
  module.exports = libh3;
else if (typeof define === 'function' && define['amd'])
  define([], function() { return libh3; });
else if (typeof exports === 'object')
  exports["libh3"] = libh3;
module.exports = libh3();

}).call(this,require('_process'),require("buffer").Buffer)
},{"_process":6,"buffer":3,"fs":1,"path":5}],10:[function(require,module,exports){
/*
 * Copyright 2018 Uber Technologies, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

module.exports = require('./dist/lib/h3core');

},{"./dist/lib/h3core":8}],11:[function(require,module,exports){
var h3 = require('h3-js');
window.testme = () => { console.log("EAY"); }
window.h3 = h3;

},{"h3-js":10}]},{},[11]);
