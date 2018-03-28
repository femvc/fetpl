// 'use strict'
//   ____             ___          __              ___              
//  /\  __`\     __  /\_ \    __  /\ \        __  /\_ \    __       
//  \ \ \  \ \  /\_\ \//\ \  /\_\ \ \ \      /\_\ \//\ \  /\_\      
//   \ \ \__\ \ \/_/   \ \ \ \/_/  \ \ \____ \/_/   \ \ \ \/_/      
//    \ \  __ <,  /\ˉ\  \ \ \  /\ˉ\ \ \ '___`\ /\ˉ\  \ \ \  /\ˉ\    
//     \ \ \  \ \ \ \ \  \ \ \ \ \ \ \ \ \  \ \\ \ \  \ \ \ \ \ \   
//      \ \ \__\ \ \ \ \  \_\ \_\ \ \ \ \ \__\ \\ \ \  \_\ \_\ \ \  
//       \ \_____/  \ \_\ /\____\\ \_\ \ \_____/ \ \_\ /\____\\ \_\ 
//        \/____/    \/_/ \/____/ \/_/  \/____/   \/_/ \/____/ \/_/ 
//                                                                  

/**
 * @namespace fetpl
 * @description fetpl是一个简易的模板引擎
 * @public
 * @author haiyang5210
 * @since 2018-03-18 10:48
 */

var fetpl = {
  version: "2.0.0",
  templateSettings: {
    tagInclude: /\{\{\s*include:\s*([\s\S]*?)\s*\}\}/g,
    tagVar: /\{\{\s*var:\s*([\s\S]*?)\s*\}\}/g,
    tagIf: /\{\{\s*if:\s*([\s\S]*?)\s*\}\}/g,
    tagElse: /\{\{\s*else:\s*\}\}/g,
    tagElIf: /\{\{\s*(else if|elif|elseif):\s*([\s\S]*?)\s*\}\}/g,
    tagIfEnd: /\{\{\s*\/if\s*\}\}/g,
    tagContent: /\{\{([\s\S]+?)\}\}/g,
    tagFor: /\{\{\s*for:\s*([\s\S]*?)\s*\}\}/g,
    tagForEnd: /\{\{\s*\/for\s*\}\}/g,
    //
    varname: "it",
    helpername: "helper",
    globalname: "dev",
    extname: ".html"
  },
  tmplist: {},
  template: undefined, //fn, compile template
  render: undefined, //fn, for express
  helper: {},
  info: {
    version: 1.0
  },
  undoescape: function (code) {
    // return code.replace(/\\('|\\)/g, "$1").replace(/[\r\t\n]/g, " ")
    return code.replace(/\\('|\\)/g, "$1")
  }
}
fetpl.template = function (tmpl, c) {
  c = c || fetpl.templateSettings
  var cse = {
    start: "';\n  out+=(",
    end: ");\n  out+='"
  }

  // var sid = 0
  // var indv
  var str = tmpl.parsedContent
  var tmp = str
  // tmp = tmp.replace(/((\r|\n)\t* *)|( *\t*(\r|\n))/g, " ")

  // // This is for include: xx
  // tmp = tmp.replace(c.tagInclude, function (m, code) {
  //   return fetpl.getTpl(tmpl, code)
  // })

  // \r\n\t
  tmp = tmp.replace(/%/g, "%25").replace(/[\n]/g, "%0A").replace(/[\r]/g, "%0D").replace(/[\t]/g, "%09")

  // {{ ' {\\{ '  }} and {{ ' }\\} '  }} 
  tmp = tmp.replace(/\{\{\s*\'\s*\{\\\{\s*\'\s*\}\}/g, "{{'{%5C{'|decodeURI}}").replace(/\{\{\s*\'\s*\}\\\}\s*\'\s*\}\}/g, "{{'}%5C}'|decodeURI}}")

  // ' \
  tmp = tmp.replace(/\\/g, "\\\\").replace(/'/g, "\\'")

  // var:
  tmp = tmp.replace(c.tagVar, function (m, code) {
    return "';\nvar " + fetpl.undoescape(code) + ";\nout+='"
  })

  // if: or elsif:
  tmp = tmp.replace(c.tagIf, function (m, code) {
    return "';\n  if(" + fetpl.undoescape(code) + "){\n  out+='"
  })
  tmp = tmp.replace(c.tagElIf, function (m, elif, code) {
    return "';}\n  else if(" + fetpl.undoescape(code) + "){\n  out+='"
  })
  tmp = tmp.replace(c.tagElse, "'}else{\n  out+='")
  tmp = tmp.replace(c.tagIfEnd, "'};\n  out+='")

  // 注：即使不用到index，也需要传入，主要为防止变量名冲突!
  // for: ... in/of ...
  tmp = tmp.replace(c.tagFor, function (m, code) {
    if (code.indexOf(' in ') < 0 && code.indexOf(" of ") < 0) return ""
    var mm = "';"
    var kk, vv, cc, tt
    var nn = ""
    var ss, str, parent
    if (code.indexOf(" in ") > -1) {
      ss = code.split(" in ")
      str = ss[0].split(",")
      parent = fetpl.undoescape(ss[1])
      kk = fetpl.undoescape(str[0])
      vv = str.length > 1 ? fetpl.undoescape(str[1]) : ""
      tt = "var " + kk + "=0; " + kk + "<" + parent + ".length; " + kk + "++"
    }
    if (code.indexOf(" of ") > -1) {
      ss = code.split(" of ")
      str = ss[0].split(",")
      parent = fetpl.undoescape(ss[1])
      kk = fetpl.undoescape(str[0])
      vv = str.length > 1 ? fetpl.undoescape(str[1]) : ""
      tt = "var " + kk + " in " + parent
      nn += "\n  if(!" + parent + "||!" + parent + ".hasOwnProperty(" + kk + ")) continue;"
    }
    if (str.length > 1) {
      nn += "\n  var " + vv + "=" + parent + "[" + kk + "];"
    }
    if (str.length === 3) {
      cc = fetpl.undoescape(str[2])
      mm = "';\nvar " + cc + "=0;"
      nn += "\n  " + cc + "++;"
    }
    return mm + "\nfor(" + tt + "){" + nn + "\n  out+='"
  })
  tmp = tmp.replace(c.tagForEnd, "'\n}\nout+='")
  tmp = tmp.replace(c.tagContent, function (m, code) {
    code = fetpl.undoescape(code)
    var list = code.split('|')
    var str = c.helpername + ".encodeURI(" + (fetpl.undoescape(list.shift())).replace(/(^\s+|\s+$)/g, "") + ")"
    for (var i = 0, len = list.length; i < len; i++) {
      str = c.helpername + "['" + list[i].replace(/(^\s+|\s+$)/g, "") + "'](" + str + ")"
    }
    return cse.start + str + cse.end
  })
  str = "//'use strict';\nvar " + c.globalname + "=fetpl.dev;\nvar " + c.helpername + "=fetpl.helper;\nvar out='" + tmp + "';"
  str += "\nout=out.replace(/\\{\\\\\\{/g, '{{').replace(/\\}\\\\\\}/g, '}}');"
  str += "\nout=out.replace(/\\{%5C\\{/g, \"{\\\\{\");"
  str += "\nout=out.replace(/\\}%5C\\}/g, \"}\\\\}\");"
  str += "\nout=out.replace(/\%0A/g, '\\n').replace(/\%0D/g, '\\r').replace(/\%09/g, '\\t').replace(/\%25/g, '\\%');"
  str += "\nreturn out;"
  str = str.replace(/(\s|;|\}|^|\{)out\+='';/g, "$1")
  str = str.replace(/\+''/g, "")
  try {
    return new Function(c.varname, str)
  } catch (e) {
    if (typeof console !== "undefined") console.log("Could not create a template function: " + str)
    throw e
  }
}
fetpl.compile = function (str, data) {
  var tmpl = {
    filePath: Math.random(),
    include: [],
    left: -1,
    originContent: str,
    parsedContent: str
  }
  fetpl.tmplist[tmpl.filePath] = tmpl
  fetpl.parseIncludes()
  
  var result = fetpl.template(tmpl, null)(data)
  fetpl.tmplist[tmpl.filePath] = null
  delete fetpl.tmplist[tmpl.filePath]
  return result
}
fetpl.parseFilePath = function (dir, sub, ext) {
  var path = require('path') // this engine requires the fs module  
  return path.join(path.dirname(dir), sub + ext)
}
fetpl.readFile = function (filePath, callback) {
  var fs = require('fs') // this engine requires the fs module  
  return fs.readFile(filePath, callback)
}
fetpl.getFileContent = function (filePath, callback) {
  fetpl.readFile(filePath, function (err, content) {
    if (err) return callback(new Error(err));
    // this is an extremely simple template engine  
    var text = content.toString()
    var tagInclude = /\{\{\s*include:\s*([\s\S]*?)\s*\}\}/g
    var arr = text.match(tagInclude) || []
    fetpl.tmplist[filePath] = {
      filePath: filePath,
      include: arr,
      left: arr.length,
      originContent: text,
      parsedContent: text
    }

    var list = []
    for (let i = 0, len = arr.length; i < len; i++) {
      var sub = arr[i].replace(/\{\{\s*include:\s*/, '').replace(/\s*\}\}$/, '')
      var addr = fetpl.parseFilePath(filePath, sub, fetpl.templateSettings.extname)
      console.log(addr)
      if (fetpl.tmplist[addr]) continue
      list.push(new Promise((resolve) => {
        fetpl.getFileContent(addr, function () {
          resolve()
        })
      }))
    }
    Promise.all(list).then(() => {
      callback(null, '')
    })
    list = null
  })
}

// 注：解析include 的子模板
fetpl.parseIncludes = function () {
  var origin = []
  var tagInclude = /\{\{\s*include:\s*([\s\S]*?)\s*\}\}/g

  for (var key in fetpl.tmplist) {
    if (!fetpl.tmplist.hasOwnProperty(key)) continue
    fetpl.tmplist[key].left = (fetpl.tmplist[key].parsedContent.match(tagInclude) || []).length
    if (fetpl.tmplist[key].left > 0) origin.push(fetpl.tmplist[key])
  }
  while (origin.length) {
    var cycle = true
    for (var k2 = origin.length - 1; k2 > -1; k2--) {
      origin[k2].parsedContent = origin[k2].parsedContent.replace(tagInclude, function (m, code) {
        var sub = m.replace(/\{\{\s*include:\s*/, '').replace(/\s*\}\}$/, '')
        var addr = fetpl.parseFilePath(origin[k2].filePath, sub, fetpl.templateSettings.extname)
        if (!fetpl.tmplist[addr]) return '<!-- include: "' + code + '" not exist -->'
        else if (fetpl.tmplist[addr].left === 0) return fetpl.tmplist[addr].parsedContent
        else return '{{include: ' + code + '}}'
      })
      origin[k2].left = (origin[k2].parsedContent.match(tagInclude) || []).length
      if (origin[k2].left < 1) {
        origin.splice(k2, 1)
        cycle = false
      }
    }
    if (cycle) return 'Error: cycle loop include.'
  }
  return null
}

fetpl.render = function (filePath, data, callback) { // define the template engine  
  console.log(filePath)
  new Promise((resolve) => {
    fetpl.getFileContent(filePath, function () {
      var err2 = fetpl.parseIncludes()
      resolve(err2)
    })
  }).then((err2) => {
    if (err2) return callback(null, err2)

    var out = ''
    try {
      // out = fetpl.compile(fetpl.tmplist[filePath])(data)
      out = fetpl.template(fetpl.tmplist[filePath], null)(data)
    } catch (e) {
      out = e.message // 'Template parse Error.'
    }
    callback(null, out)
  })
}

if (typeof global !== 'undefined' && typeof exports !== 'undefined') {
  global.fetpl = fetpl
  exports.render = fetpl.render
} else if (typeof document !== 'undefined') {
  fetpl.parseFilePath = function (dir, sub, ext) {
    return sub
  }
  fetpl.readFile = function (filePath, callback) {
    callback(null, document.getElementById(filePath).innerHTML)
  }
}

//======================== Helper begin ========================//
/**
 * 对特殊字符和换行符编码// .replace(/%/ig,"%-")
 */
fetpl.helper.encodeURI = function (str, isDecode) {
  str = String(str)
  // encodeURIComponent not deal with '
  var i, l, fr = '%| |&|;|=|+|<|>|,|"|\'|#|/|\\|\n|\r|\t'.split('|'),
    to = '%25|%20|%26|%3B|%3D|%2B|%3C|%3E|%2C|%22|%27|%23|%2F|%5C|%0A|%0D|%09'.split('|')
  if (isDecode == 'isDecode') {
    for (i = fr.length - 1; i > -1; i--) {
      str = str.replace(new RegExp('\\' + to[i], 'ig'), fr[i])
    }
  } else {
    for (i = 0, l = fr.length; i < l; i++) {
      str = str.replace(new RegExp('\\' + fr[i], 'ig'), to[i])
    }
  }
  return str
}
fetpl.helper.decodeURI = function (str) {
  return fetpl.helper.encodeURI(str, 'isDecode')
}
/**
 * 对HTML进行编码// .replace(/%/ig,"%-")
 */
fetpl.helper.encode = function (str, isDecode) {
  str = String(str)
  // encodeURIComponent not deal with '
  var i, l, fr = '&|<|>| |\'|"|\\'.split('|'),
    to = '&amp;|&lt;|&gt;|&nbsp;|&apos;|&quot;|&#92;'.split('|')
  if (isDecode == 'isDecode') {
    for (i = fr.length - 1; i > -1; i--) {
      str = str.replace(new RegExp('\\' + to[i], 'ig'), fr[i])
    }
  } else {
    for (i = 0, l = fr.length; i < l; i++) {
      str = str.replace(new RegExp('\\' + fr[i], 'ig'), to[i])
    }
  }
  return str
}
fetpl.helper.decode = function (str) {
  return fetpl.helper.encode(str, 'isDecode')
}
/**
 * @method fetpl.helper.formatDate
 * @description 将Date类型解析为String类型. 
 * @param {Date} date 输入的日期
 * @param {String} fmt 输出日期格式
 * @example
 * fetpl.helper.formatDate(new Date(2006,0,1), 'yyyy-MM-dd HH:mm')
 */
fetpl.helper.formatDate = function (date, fmt) {
  if (!date) date = new Date()
  fmt = fmt || 'yyyy-MM-dd HH:mm:ss'
  var o = {
    'M+': date.getMonth() + 1, //月份      
    'd+': date.getDate(), //日      
    'h+': date.getHours() % 12 === 0 ? 12 : date.getHours() % 12, //小时      
    'H+': date.getHours(), //小时      
    'm+': date.getMinutes(), //分      
    's+': date.getSeconds(), //秒      
    'q+': Math.floor((date.getMonth() + 3) / 3), //季度      
    'S': date.getMilliseconds() //毫秒      
  }
  var week = {
    '0': '/u65e5',
    '1': '/u4e00',
    '2': '/u4e8c',
    '3': '/u4e09',
    '4': '/u56db',
    '5': '/u4e94',
    '6': '/u516d'
  }
  if (/(y+)/.test(fmt)) {
    fmt = fmt.replace(RegExp.$1, (date.getFullYear() + '').substr(4 - RegExp.$1.length))
  }
  if (/(E+)/.test(fmt)) {
    fmt = fmt.replace(RegExp.$1, ((RegExp.$1.length > 1) ? (RegExp.$1.length > 2 ? '/u661f/u671f' : '/u5468') : '') + week[date.getDay() + ''])
  }
  for (var k in o) {
    if (o.hasOwnProperty(k) && new RegExp('(' + k + ')').test(fmt)) {
      fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (('00' + o[k]).substr(('' + o[k]).length)))
    }
  }
  return fmt
}
/**
 * @method fetpl.helper.parseDate
 * @description 将String类型解析为Date类型.  
 * @param {String} fmt 输入的字符串格式的日期
 * @example
 * parseDate('2006-1-1') return new Date(2006,0,1)  
 * parseDate(' 2006-1-1 ') return new Date(2006,0,1)  
 * parseDate('2006-1-1 15:14:16') return new Date(2006,0,1,15,14,16)  
 * parseDate(' 2006-1-1 15:14:16 ') return new Date(2006,0,1,15,14,16);  
 * parseDate('不正确的格式') retrun null  
 */
fetpl.helper.parseDate = function (str) {
  str = String(str).replace(/^[\s\xa0]+|[\s\xa0]+$/ig, '')
  var results = null

  //秒数 #9744242680 
  results = str.match(/^ *(\d{10}) *$/)
  if (results && results.length > 0)
    return new Date(parseInt(str, 10) * 1000)

  //毫秒数 #9744242682765 
  results = str.match(/^ *(\d{13}) *$/)
  if (results && results.length > 0)
    return new Date(parseInt(str, 10))

  //20110608 
  results = str.match(/^ *(\d{4})(\d{2})(\d{2}) *$/)
  if (results && results.length > 3)
    return new Date(parseInt(results[1], 10), parseInt(results[2], 10) - 1, parseInt(results[3], 10))

  //20110608 1010 
  results = str.match(/^ *(\d{4})(\d{2})(\d{2}) +(\d{2})(\d{2}) *$/)
  if (results && results.length > 5)
    return new Date(parseInt(results[1], 10), parseInt(results[2], 10) - 1, parseInt(results[3], 10), parseInt(results[4], 10), parseInt(results[5], 10))

  //2011-06-08 
  results = str.match(/^ *(\d{4})[\._\-\/\\](\d{1,2})[\._\-\/\\](\d{1,2}) *$/)
  if (results && results.length > 3)
    return new Date(parseInt(results[1], 10), parseInt(results[2], 10) - 1, parseInt(results[3], 10))

  //2011-06-08 10:10 
  results = str.match(/^ *(\d{4})[\._\-\/\\](\d{1,2})[\._\-\/\\](\d{1,2}) +(\d{1,2}):(\d{1,2}) *$/)
  if (results && results.length > 5)
    return new Date(parseInt(results[1], 10), parseInt(results[2], 10) - 1, parseInt(results[3], 10), parseInt(results[4], 10), parseInt(results[5], 10))

  //2011/06\\08 10:10:10 
  results = str.match(/^ *(\d{4})[\._\-\/\\](\d{1,2})[\._\-\/\\](\d{1,2}) +(\d{1,2}):(\d{1,2}):(\d{1,2}) *$/)
  if (results && results.length > 6)
    return new Date(parseInt(results[1], 10), parseInt(results[2], 10) - 1, parseInt(results[3], 10), parseInt(results[4], 10), parseInt(results[5], 10), parseInt(results[6], 10))

  return (new Date(str))
}
//======================== Helper end ========================//