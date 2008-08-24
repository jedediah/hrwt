// The license of this source is "Ruby License"

function asyncFunc(func) {
  func.async = true;
  return func;
}

var Ruby = {
  
  sendAsync: function(receiver, name, args, block, callback) {
    if (typeof(callback) == "undefined") {
      if (typeof(block) == "undefined") {
        callback = args;
        args = [];
      } else {
        callback = block;
        block = null;
      }
    }
    //console.log(receiver, name, args, block, callback);
    Ruby.vm.invokeMethod(receiver, name, args, block, 0, false, null, callback);
  },
  
  /**
   * Returns class name from object.
   * @param obj
   * @return {String}
   */
  getClass : function(obj) {
    if (obj == null)
      return Ruby.NilClass;
    switch (typeof(obj)) {
      case "object" :
        return obj.rubyClass;
      case "number" :
        // TODO: Cannot distinguish 1 and 1.0. Fix it later.
        return Math.floor(obj) == obj ? Ruby.Integer : Ruby.Float;
      case "boolean" :
        return obj ? Ruby.TrueClass : Ruby.FalseClass;
      default :
        Ruby.fatal("[getClass] unknown type : " + typeof(obj));
    }
  },
  
  getSingletonClass: function(obj) {
    if (obj !== null && obj.rubyClass) {
      if (!obj.singletonClass) {
        obj.singletonClass = new RubyModule(null, {
          superClass: obj.rubyClass,
          type: "singleton"
        });
      }
      return obj.singletonClass;
    } else {
      Ruby.fatal("Cannot define singleton method for: " + obj.toString());
    }
  },
  
  eachAncestor: function(classObj, block) {
    var res;
    while (classObj) {
      if (typeof(res = block(classObj)) != "undefined") return res;
      var included = classObj.included;
      for (var i = included.length - 1; i >= 0; --i) {
        if (typeof(res = block(included[i])) != "undefined") return res;
      }
      classObj = classObj.superClass;
    }
  },
  
  defineClass: function(className, params) {
    params.type = "class";
    return new RubyModule(className, params);
  },
  
  defineModule: function(className, params) {
    params.type = "module";
    return new RubyModule(className, params);
  },
  
  makeModuleFunction: function(classObj, name) {
    // TODO: make it private
    Ruby.getSingletonClass(classObj).methods[name] = classObj.methods[name];
  },
  
  /**
   * Convert ruby object to native value
   * @param v ruby object
   */
  rubyObjectToNative: function(v) {
    if(typeof(v) != "object") 
      return v;
    if(v.rubyClass == Ruby.Proc) {
      var func = function() {
        var proc = arguments.callee.proc;
        var result;
        Ruby.vm.runOpcode(
          proc.opcode, 
          proc.parentStackFrame.classObj, 
          proc.parentStackFrame.methodName, 
          proc.parentStackFrame.self, 
          Ruby.nativeAryToRubyObjectAry(arguments),
          null,
          proc.parentStackFrame,
          true,
          function(res, ex) {
            if (ex) throw ex;
            result = res;
          }
        );
        return result;
      };
      func.proc = v;
      return func;
    }
    return v.native;
  },
  
  /**
   * Convert array of ruby object to array of native object
   * @param {Array} ary Array of ruby object
   */
  rubyObjectAryToNativeAry: function(ary) {
    var convAry = new Array(ary.length);
    for(var i=0; i<ary.length; i++) {
      convAry[i] = Ruby.rubyObjectToNative(ary[i]);
    }
    return convAry;
  },
  
  /**
   * Convert native object to ruby object
   * @param v native object
   */
  nativeToRubyObject: function(v) {
    if (typeof(v) == "undefined") {
      return null;
    }
    if (v === null || typeof(v) == "boolean" || typeof(v) == "number") {
      return v;  
    }
    if (typeof(v) == "object" && v.rubyClass) {
      return v;
    }
    if (typeof(v) == "string") {
      return Ruby.toRubyString(v);
    }
    if (typeof(v) == "object" && v instanceof Array) {
      var ary = new Array(v.length);
      for (var i = 0; i < v.length; ++i) {
        ary[i] = Ruby.nativeToRubyObject(v[i]);
      }
      return Ruby.toRubyArray(ary);
    }
    var obj = new RubyObject(Ruby.NativeObject);
    obj.native = v;
    return obj;
  },
  
  /**
   * Convert array of native object to array of ruby object
   * @param {Array} ary Array of native object
   */
  nativeAryToRubyObjectAry: function(ary) {
    var convAry = new Array(ary.length);
    for(var i=0; i<ary.length; i++) {
      convAry[i] = Ruby.nativeToRubyObject(ary[i]);
    }
    return convAry;
  },
  
  /**
   * JavaScript String -> Ruby String
   * @param {String} str
   * @return {String}
   */
  toRubyString : function(str) {
    var obj = new RubyObject(Ruby.String);
    obj.native = str;
    return obj;
  },
  
  /**
   * opcode -> Ruby Proc
   * @param {Array} opcode
   * @param {RubyVM.StackFrame} sf
   * @return {Object} Proc
   */
  toRubyProc : function(opcode, sf) {
    var obj = new RubyObject(Ruby.Proc);
    obj.opcode = opcode;
    obj.parentStackFrame = sf;
    return obj;
  },
  
  /**
   * JavaScript Array -> Ruby Array
   * @param {Array} ary
   * @return {Array}
   */
  toRubyArray : function(ary) {
    var obj = new RubyObject(Ruby.Array);
    obj.native = ary;
    return obj;
  },
  
  /**
   * JavaScript Array -> Ruby Hash
   * @param {Array} ary
   * @return {Object}
   */
  toRubyHash : function(ary) {
    var hash = new RubyObject(Ruby.Hash);
    hash.instanceVars = {
      length : ary.length / 2
    };
    hash.native = {};
    for (var i = 0;i < ary.length; i += 2) {
      if(ary[i] !== null && ary[i].rubyClass == Ruby.String) {
        hash.native[ary[i].native] = ary[i + 1];
      } else {
        Ruby.fatal("[toRubyHash] Unsupported. Cannot put this object to Hash");
      }
    }
    return hash;
  },
  
  /**
   * Creates Ruby Range
   * @param {Number} last
   * @param {Number} first
   * @param {boolean} exclude_end
   */
  toRubyRange : function(last, first, exclude_end) {
    var obj = new RubyObject(Ruby.Range);
    obj.instanceVars = {
      first : first,
      last : last,
      exclude_end : exclude_end
    };
    return obj;
  },
  
  intern: function(str) {
    // TODO: should be Symbol instead of String
    return Ruby.toRubyString(str);
  },
  
  toBoolean: function(val) {
    return val !== false && val !== null;
  },
  
  // Async version of for (; cond(); increment()) { body(); }
  loopAsync: function(cond, increment, body, callback) {
    var deferred = false;
    for(; !deferred && cond(); increment()) {
      (function() {
        var inBody = true;
        var callbackCalled = false;
        body(function(res, ex) {
          if (ex) return callback(null, ex);
          if (inBody) {
            callbackCalled = true;
          } else {
            increment();
            Ruby.loopAsync(cond, increment, body, callback);
          }
        });
        inBody = false;
        if (!callbackCalled) deferred = true;
      })();
      if (deferred) return;
    }
    callback();
  },

  /**
   * Print to debug dom.
   * @param {String} str
   */
  printDebug : function(str) {
    switch(Ruby.vm.env) {
      case "browser":
        var div = document.createElement("div");
        var text = document.createTextNode(str);
        div.appendChild(text);
        Ruby.vm.debugDom.appendChild(div);
        break;
      case "flash":
        RubyVM.debugTextField.text += str + "\n";
        break;
      case "rhino":
        print(str);
        break;
      default:
        Ruby.fatal("Unknown env");
        break;
    }
  },

  fatal: function(message) {
    console.error(message);
    throw "Aborted";
  }

};
