const schema = require('./schema.json');
const BN = require('bn.js');
const toBuffer = require('./utils/').toBuffer;
const stripHexPrefix = require('./utils/').stripHexPrefix;
const isHexPrefixed = require('./utils/').isHexPrefixed;
const arrayContainsArray = require('./utils/').arrayContainsArray;

// format quantity value, either encode to hex, or decode to BigNumber
// should intake null, stringNumber, number, BN
function formatQuantity(value, encode) {
  var output = value;

  // if hex string, number string or number, encode into bignumber
  if (typeof value === 'string'
   || typeof value === 'number') {
    if (String(value).match(/[A-Za-z]/i)) {
     output = new BN(toBuffer(`0x${stripHexPrefix(value)}`));
    } else {
     output = new BN(value);
    }
  }

  // encode to BigNumber to hex
  if (typeof output === 'object'
   && value !== null && encode) {
    output = `0x${output.toString(16).toLowerCase()}`;
  }

  return output;
}

// format quantity or tag, if tag bypass return, else format quantity
// should intake null, stringNumber, number, BN
function formatQuantityOrTag(value, encode) {
  var output = value;

  // if the value is a tag, bypass
  if (schema.tags.indexOf(value) === -1) {
    output = formatQuantity(value, encode);
  }

  return output;
}

// format object with caviets
function formatObject(formatter, value, encode) {
  var output = Object.assign({}, value);
  var formatObject = null;

  // if the object is a string flag, then retreive the object
  if (typeof formatter === 'string') {
    if (formatter === 'Boolean|EthSyncing') {
      formatObject = Object.assign({}, schema.objects['EthSyncing']);
    } else if (formatter === 'DATA|Transaction') {
      formatObject = Object.assign({}, schema.objects['Transaction']);
    } else {
      formatObject = Object.assign({}, schema.objects[formatter]);
    }
  }

  // check if all required data keys are fulfilled
  if (!arrayContainsArray(Object.keys(value), formatObject.__required)) {
    throw new Error(`object ${JSON.stringify(value)} must contain properties: ${formatObject.__required.join(', ')}`);
  }

  // assume formatObject is an object, go through keys and format each
  Object.keys(value).forEach((valueKey) => {
    output[valueKey] = format(formatObject[valueKey], value[valueKey], encode);
  });

  return output;
}

// format array
function formatArray(formatter, value, encode) {
  var output = value.slice();
  var formatObject = formatter;

  // if the formatter is an array or data, then make format object an array data
  if (formatter === 'Array|DATA') {
    formatObject = ['DATA'];
  }

  // make new array, avoid mutation
  formatObject = formatObject.slice();

  // assume formatObject is an object, go through keys and format each
  value.forEach((valueKey, valueIndex) => {
    // use key zero as formatter for all values, unless otherwise specified
    var formatObjectKey = 0;

    // if format array is exact, check each argument against formatter argument
    if (formatObject.length > 1) {
      formatObjectKey = valueIndex;
    }

    output[valueIndex] = format(formatObject[formatObjectKey], valueKey, encode);
  });

  return output;
}

// formatData under strict conditions hex prefix
function formatData(value) {
  var output = value;

  // prefix only under strict conditions, else bypass
  if (typeof value === 'string'
    && value !== null
    && isHexPrefixed(value) === false) {
    output = `0x${value}`;
  }

  return output;
}

// format payload encode or decode, bypass string, Boolean, DATA
function format(formatter, value, encode) {
  var output = value;

  // if formatter is quantity or quantity or tag
  if (formatter === 'QUANTITY') {
    output = formatQuantity(value, encode);
  } else if (formatter === 'QUANTITY|TAG') {
    output = formatQuantityOrTag(value, encode);
  } else if (formatter === 'DATA') {
    output = formatData(value); // dont format data flagged objects like compiler output
  } else {
    // if value is an object or array
    if (typeof value === 'object'
      && value !== null
      && Array.isArray(value) === false) {
      output = formatObject(formatter, value, encode);
    } else if (Array.isArray(value)) {
      output = formatArray(formatter, value, encode);
    }
  }

  return output;
}

// format method inputs, assume values is array
// return formatted array
function formatInputs(method, inputs) {
  return format(schema.methods[method][0], inputs, true);
}

// format method inputs, assume values is array
// return formatted array
function formatOutputs(method, outputs) {
  return format(schema.methods[method][1], outputs, false);
}

// export formatters
module.exports = {
  formatQuantity,
  formatQuantityOrTag,
  formatObject,
  formatArray,
  format,
  formatInputs,
  formatOutputs,
};
