var _ = require("underscore");
var os = require("os");
var path = require("path");
var assert = require("assert");

// All of these functions are attached to files.js for the tool;
// they live here because we need them in boot.js as well to avoid duplicating
// a lot of the code.
//
// Note that this file does NOT contain any of the "perform I/O maybe
// synchronously" functions from files.js; this is intentional, because we want
// to make it very hard to accidentally use fs.*Sync functions in the app server
// after bootup (since they block all concurrency!)
var files = module.exports;

// Detect that we are on a Windows-like Filesystem, such as that in a WSL
// (Windows Subsystem for Linux) even if it otherwise looks like we're on Unix.
// https://github.com/Microsoft/BashOnWindows/issues/423#issuecomment-221627364
var isWindowsLikeFilesystem = function () {
  return process.platform === "win32" ||
    (os.release().indexOf("Microsoft") > -1);
};

var toPosixPath = function (p, partialPath) {
  // Sometimes, you can have a path like \Users\IEUser on windows, and this
  // actually means you want C:\Users\IEUser
  if (p[0] === "\\" && (! partialPath)) {
    p = process.env.SystemDrive + p;
  }

  p = p.replace(/\\/g, '/');
  if (p[1] === ':' && ! partialPath) {
    // transform "C:/bla/bla" to "/c/bla/bla"
    p = '/' + p[0] + p.slice(2);
  }

  return p;
};

var toDosPath = function (p, partialPath) {
  if (p[0] === '/' && ! partialPath) {
    if (! /^\/[A-Za-z](\/|$)/.test(p))
      throw new Error("Surprising path: " + p);
    // transform a previously windows path back
    // "/C/something" to "c:/something"
    p = p[1] + ":" + p.slice(2);
  }

  p = p.replace(/\//g, '\\');
  return p;
};


var convertToOSPath = function (standardPath, partialPath) {
  if (process.platform === "win32") {
    return toDosPath(standardPath, partialPath);
  }

  return standardPath;
};

var convertToStandardPath = function (osPath, partialPath) {
  if (process.platform === "win32") {
    return toPosixPath(osPath, partialPath);
  }

  return osPath;
}

var convertToOSLineEndings = function (fileContents) {
  return fileContents.replace(/\n/g, os.EOL);
};

var convertToStandardLineEndings = function (fileContents) {
  // Convert all kinds of end-of-line chars to linuxy "\n".
  return fileContents.replace(new RegExp("\r\n", "g"), "\n")
                     .replace(new RegExp("\r", "g"), "\n");
};

// Return the Unicode Normalization Form of the passed in path string, using
// "Normalization Form Canonical Composition"
const unicodeNormalizePath = (path) => {
  return (path) ? path.normalize('NFC') : path;
};

// wrappings for path functions that always run as they were on unix (using
// forward slashes)
var wrapPathFunction = function (name, partialPaths) {
  var f = path[name];
  assert.strictEqual(typeof f, "function");

  return function (/* args */) {
    if (process.platform === 'win32') {
      var args = _.toArray(arguments);
      args = _.map(args, function (p, i) {
        // if partialPaths is turned on (for path.join mostly)
        // forget about conversion of absolute paths for Windows
        return toDosPath(p, partialPaths);
      });

      var result = f.apply(path, args);
      if (typeof result === "string") {
        result = toPosixPath(result, partialPaths);
      }

      return result;
    }

    return f.apply(path, arguments);
  };
};

files.pathJoin = wrapPathFunction("join", true);
files.pathNormalize = wrapPathFunction("normalize");
files.pathRelative = wrapPathFunction("relative");
files.pathResolve = wrapPathFunction("resolve");
files.pathDirname = wrapPathFunction("dirname");
files.pathBasename = wrapPathFunction("basename");
files.pathExtname = wrapPathFunction("extname");
// The path.isAbsolute function is implemented in Node v4.
files.pathIsAbsolute = wrapPathFunction("isAbsolute");
files.pathSep = '/';
files.pathDelimiter = ':';
files.pathOsDelimiter = path.delimiter;

files.isWindowsLikeFilesystem = isWindowsLikeFilesystem;

files.convertToStandardPath = convertToStandardPath;
files.convertToOSPath = convertToOSPath;
files.convertToWindowsPath = toDosPath;
files.convertToPosixPath = toPosixPath;

files.convertToStandardLineEndings = convertToStandardLineEndings;
files.convertToOSLineEndings = convertToOSLineEndings;
files.unicodeNormalizePath = unicodeNormalizePath;
