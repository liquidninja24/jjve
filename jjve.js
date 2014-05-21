(function() {
  function make(o) {
    var errors = [];

    var keys = Object.keys(o.validation);

    // when we're on a leaf node we need to handle the validation errors,
    // otherwise we continue walking
    var leaf = keys.every(function(key) {
      return typeof o.validation[key] !== 'object';
    });

    if (leaf) {
      // step through each validation issue
      // example: { required: true }
      keys.forEach(function(key) {
        var error;

        switch (key) {
          case 'type':
            var type = typeof o.data;

            // further discover types
            if (type === 'number' && ('' + o.data).match(/^\d+$/)) {
              type = 'integer';
            } else if (type === 'object' && Array.isArray(o.data)) {
              type = 'array';
            }

            // the value of type is the required type (ex: { type: 'string' })
            error = {
              code: 'INVALID_TYPE',
              message: 'Invalid type: ' + type + ' should be ' + o.validation[key],
            };

            break;
          case 'required':
            var properties = o.ns.split(o.sep);

            error = {
              code: 'OBJECT_REQUIRED',
              message: 'Missing required property: ' + properties[properties.length-1],
            };

            break;
          case 'minimum':
            error = {
              code: 'MINIMUM',
              message: 'Value ' + o.data + ' is less than minimum ' + o.schema.minimum,
            };

            break;
          case 'maximum':
            error = {
              code: 'MAXIMUM',
              message: 'Value ' + o.data + ' is greater than maximum ' + o.schema.maximum,
            };

            break;
          case 'multipleOf':
            error = {
              code: 'MULTIPLE_OF',
              message: 'Value ' + o.data + ' is not a multiple of ' + o.schema.multipleOf,
            };

            break;
          case 'pattern':
            error = {
              code: 'PATTERN',
              message: 'String does not match pattern: ' + o.schema.pattern,
            };

            break;
          case 'minLength':
            error = {
              code: 'MIN_LENGTH',
              message: 'String is too short (' + o.data.length + ' chars), minimum ' + o.schema.minLength,
            };

            break;
          case 'maxLength':
            error = {
              code: 'MAX_LENGTH',
              message: 'String is too long (' + o.data.length + ' chars), maximum ' + o.schema.maxLength,
            };

            break;
          case 'minItems':
            error = {
              code: 'ARRAY_LENGTH_SHORT',
              message: 'Array is too short (' + o.data.length + '), minimum ' + o.schema.minItems,
            };

            break;
          case 'maxItems':
            error = {
              code: 'ARRAY_LENGTH_LONG',
              message: 'Array is too long (' + o.data.length + '), maximum ' + o.schema.maxItems,
            };

            break;
          case 'uniqueItems':
            error = {
              code: 'ARRAY_UNIQUE',
              message: 'Array items are not unique',
            };

            break;
          case 'minProperties':
            error = {
              code: 'OBJECT_PROPERTIES_MINIMUM',
              message: 'Too few properties defined (' + Object.keys(o.data).length + '), minimum ' + o.schema.minProperties,
            };

            break;
          case 'maxProperties':
            error = {
              code: 'OBJECT_PROPERTIES_MAXIMUM',
              message: 'Too many properties defined (' + Object.keys(o.data).length + '), maximum ' + o.schema.maxProperties,
            };

            break;
          case 'enum':
            error = {
              code: 'ENUM_MISMATCH',
              message: 'No enum match (' + o.data + '), expects: ' + o.schema.enum.join(', '),
            };

            break;
          case 'not':
            error = {
              code: 'NOT_PASSED',
              message: 'Data matches schema from "not"',
            };

            break;
          case 'additional':
            var properties = o.ns.split(o.sep);

            error = {
              code: 'ADDITIONAL_PROPERTIES',
              message: 'Additional properties not allowed: ' + properties[properties.length-1],
            };

            break;
          default:
            // for all the validation errors I haven't implemented yet
            error = {
              code: 'UNKNOWN_ERROR',
              message: 'Validation error: ' + key + ' (' + o.validation[key] + ')',
            };
        }

        if (error) {
          if (o.data !== undefined) error.data = o.data;
          error.path = o.ns;
          errors.push(error);
        }
      });
    } else {
      // handle all non-leaf children
      keys.forEach(function(key) {
        var s;
        var isArray = false;

        if (o.schema.type) {
          switch (o.schema.type) {
            case 'object':
              if (o.schema.properties && o.schema.properties[key]) {
                s = o.schema.properties[key];
              }

              if (!s && o.schema.patternProperties) {
                Object.keys(o.schema.patternProperties).some(function(pkey) {
                  if (key.match(new RegExp(pkey))) {
                    s = o.schema.patternProperties[pkey];
                    return true;
                  }
                });
              }

              break;
            case 'array':
              s = o.schema.items;
              isArray = true;

              break;
          }
        }

        errors = errors.concat(make({
          schema: s,
          data: o.data[isArray ? parseInt(key, 10) : key],
          validation: o.validation[key].schema ? o.validation[key].schema : o.validation[key],
          ns: o.ns + (isArray ? '[' + key + ']' : (o.sep + key)),
          sep: o.sep,
        }));
      });
    }

    return errors;
  }

  function jjve(env) {
    return function jjve(schema, data, result, options) {
      if (!result || !result.validation) return [];

      options = options || {};

      if (!options.hasOwnProperty('root')) options.root = '$';
      if (!options.hasOwnProperty('sep')) options.sep = '.';
      if (typeof schema === 'string') schema = env.schema[schema];

      return make({
        schema: schema,
        data: data,
        validation: result.validation,
        sep: options.sep,
        ns: options.root,
      });
    };
  }

  // Export for use in server and client.
  if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = jjve;
  } else if (typeof define === 'function' && define.amd) {
    define(function() { return jjve; });
  } else {
    this.jjve = jjve;
  }
}).call(this);