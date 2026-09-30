// ==========================================================================
// SFX Browser — ExtendScript Host Engine (Embedded JSON2 Polyfill)
// ==========================================================================

//  json2.js
//  2017-06-12
//  Public Domain.
//  NO WARRANTY EXPRESSED OR IMPLIED. USE AT YOUR OWN RISK.

//  USE YOUR OWN COPY. IT IS EXTREMELY UNWISE TO LOAD CODE FROM SERVERS YOU DO
//  NOT CONTROL.

//  This file creates a global JSON object containing two methods: stringify
//  and parse. This file provides the ES5 JSON capability to ES3 systems.
//  If a project might run on IE8 or earlier, then this file should be included.
//  This file does nothing on ES5 systems.

//      JSON.stringify(value, replacer, space)
//          value       any JavaScript value, usually an object or array.
//          replacer    an optional parameter that determines how object
//                      values are stringified for objects. It can be a
//                      function or an array of strings.
//          space       an optional parameter that specifies the indentation
//                      of nested structures. If it is omitted, the text will
//                      be packed without extra whitespace. If it is a number,
//                      it will specify the number of spaces to indent at each
//                      level. If it is a string (such as "\t" or "&nbsp;"),
//                      it contains the characters used to indent at each level.
//          This method produces a JSON text from a JavaScript value.
//          When an object value is found, if the object contains a toJSON
//          method, its toJSON method will be called and the result will be
//          stringified. A toJSON method does not serialize: it returns the
//          value represented by the name/value pair that should be serialized,
//          or undefined if nothing should be serialized. The toJSON method
//          will be passed the key associated with the value, and this will be
//          bound to the value.

//          For example, this would serialize Dates as ISO strings.

//              Date.prototype.toJSON = function (key) {
//                  function f(n) {
//                      // Format integers to have at least two digits.
//                      return (n < 10)
//                          ? "0" + n
//                          : n;
//                  }
//                  return this.getUTCFullYear()   + "-" +
//                       f(this.getUTCMonth() + 1) + "-" +
//                       f(this.getUTCDate())      + "T" +
//                       f(this.getUTCHours())     + ":" +
//                       f(this.getUTCMinutes())   + ":" +
//                       f(this.getUTCSeconds())   + "Z";
//              };

//          You can provide an optional replacer method. It will be passed the
//          key and value of each member, with this bound to the containing
//          object. The value that is returned from your method will be
//          serialized. If your method returns undefined, then the member will
//          be excluded from the serialization.

//          If the replacer parameter is an array of strings, then it will be
//          used to select the members to be serialized. It filters the results
//          such that only members with keys listed in the replacer array are
//          stringified.

//          Values that do not have JSON representations, such as undefined or
//          functions, will not be serialized. Such values in objects will be
//          dropped; in arrays they will be replaced with null. You can use
//          a replacer function to replace those with JSON values.

//          JSON.stringify(undefined) returns undefined.

//          The optional space parameter produces a stringification of the
//          value that is filled with line breaks and indentation to make it
//          easier to read.

//          If the space parameter is a non-empty string, then that string will
//          be used for indentation. If the space parameter is a number, then
//          the indentation will be that many spaces.

//          Example:

//          text = JSON.stringify(["e", {pluribus: "unum"}]);
//          // text is '["e",{"pluribus":"unum"}]'

//          text = JSON.stringify(["e", {pluribus: "unum"}], null, "\t");
//          // text is '[\n\t"e",\n\t{\n\t\t"pluribus": "unum"\n\t}\n]'

//          text = JSON.stringify([new Date()], function (key, value) {
//              return this[key] instanceof Date
//                  ? "Date(" + this[key] + ")"
//                  : value;
//          });
//          // text is '["Date(---current time---)"]'

//      JSON.parse(text, reviver)
//          This method parses a JSON text to produce an object or array.
//          It can throw a SyntaxError exception.

//          The optional reviver parameter is a function that can filter and
//          transform the results. It receives each of the keys and values,
//          and its return value is used instead of the original value.
//          If it returns what it received, then the structure is not modified.
//          If it returns undefined then the member is deleted.

//          Example:

//          // Parse the text. Values that look like ISO date strings will
//          // be converted to Date objects.

//          myData = JSON.parse(text, function (key, value) {
//              var a;
//              if (typeof value === "string") {
//                  a =
//   /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*)?)Z$/.exec(value);
//                  if (a) {
//                      return new Date(Date.UTC(
//                         +a[1], +a[2] - 1, +a[3], +a[4], +a[5], +a[6]
//                      ));
//                  }
//                  return value;
//              }
//          });

//          myData = JSON.parse(
//              "[\"Date(09/09/2001)\"]",
//              function (key, value) {
//                  var d;
//                  if (
//                      typeof value === "string"
//                      && value.slice(0, 5) === "Date("
//                      && value.slice(-1) === ")"
//                  ) {
//                      d = new Date(value.slice(5, -1));
//                      if (d) {
//                          return d;
//                      }
//                  }
//                  return value;
//              }
//          );

//  This is a reference implementation. You are free to copy, modify, or
//  redistribute.

/*jslint
    eval, for, this
*/

/*property
    JSON, apply, call, charCodeAt, getUTCDate, getUTCFullYear, getUTCHours,
    getUTCMinutes, getUTCMonth, getUTCSeconds, hasOwnProperty, join,
    lastIndex, length, parse, prototype, push, replace, slice, stringify,
    test, toJSON, toString, valueOf
*/


// Create a JSON object only if one does not already exist. We create the
// methods in a closure to avoid creating global variables.

if (typeof JSON !== "object") {
    JSON = {};
}

(function () {
    "use strict";

    var rx_one = /^[\],:{}\s]*$/;
    var rx_two = /\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g;
    var rx_three = /"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g;
    var rx_four = /(?:^|:|,)(?:\s*\[)+/g;
    var rx_escapable = /[\\"\u0000-\u001f\u007f-\u009f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;
    var rx_dangerous = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;

    function f(n) {
        // Format integers to have at least two digits.
        return (n < 10)
            ? "0" + n
            : n;
    }

    function this_value() {
        return this.valueOf();
    }

    if (typeof Date.prototype.toJSON !== "function") {

        Date.prototype.toJSON = function () {

            return isFinite(this.valueOf())
                ? (
                    this.getUTCFullYear()
                    + "-"
                    + f(this.getUTCMonth() + 1)
                    + "-"
                    + f(this.getUTCDate())
                    + "T"
                    + f(this.getUTCHours())
                    + ":"
                    + f(this.getUTCMinutes())
                    + ":"
                    + f(this.getUTCSeconds())
                    + "Z"
                )
                : null;
        };

        Boolean.prototype.toJSON = this_value;
        Number.prototype.toJSON = this_value;
        String.prototype.toJSON = this_value;
    }

    var gap;
    var indent;
    var meta;
    var rep;


    function quote(string) {

// If the string contains no control characters, no quote characters, and no
// backslash characters, then we can safely slap some quotes around it.
// Otherwise we must also replace the offending characters with safe escape
// sequences.

        rx_escapable.lastIndex = 0;
        return rx_escapable.test(string)
            ? "\"" + string.replace(rx_escapable, function (a) {
                var c = meta[a];
                return typeof c === "string"
                    ? c
                    : "\\u" + ("0000" + a.charCodeAt(0).toString(16)).slice(-4);
            }) + "\""
            : "\"" + string + "\"";
    }


    function str(key, holder) {

// Produce a string from holder[key].

        var i;          // The loop counter.
        var k;          // The member key.
        var v;          // The member value.
        var length;
        var mind = gap;
        var partial;
        var value = holder[key];

// If the value has a toJSON method, call it to obtain a replacement value.

        if (
            value
            && typeof value === "object"
            && typeof value.toJSON === "function"
        ) {
            value = value.toJSON(key);
        }

// If we were called with a replacer function, then call the replacer to
// obtain a replacement value.

        if (typeof rep === "function") {
            value = rep.call(holder, key, value);
        }

// What happens next depends on the value's type.

        switch (typeof value) {
        case "string":
            return quote(value);

        case "number":

// JSON numbers must be finite. Encode non-finite numbers as null.

            return (isFinite(value))
                ? String(value)
                : "null";

        case "boolean":
        case "null":

// If the value is a boolean or null, convert it to a string. Note:
// typeof null does not produce "null". The case is included here in
// the remote chance that this gets fixed someday.

            return String(value);

// If the type is "object", we might be dealing with an object or an array or
// null.

        case "object":

// Due to a specification blunder in ECMAScript, typeof null is "object",
// so watch out for that case.

            if (!value) {
                return "null";
            }

// Make an array to hold the partial results of stringifying this object value.

            gap += indent;
            partial = [];

// Is the value an array?

            if (Object.prototype.toString.apply(value) === "[object Array]") {

// The value is an array. Stringify every element. Use null as a placeholder
// for non-JSON values.

                length = value.length;
                for (i = 0; i < length; i += 1) {
                    partial[i] = str(i, value) || "null";
                }

// Join all of the elements together, separated with commas, and wrap them in
// brackets.

                v = partial.length === 0
                    ? "[]"
                    : gap
                        ? (
                            "[\n"
                            + gap
                            + partial.join(",\n" + gap)
                            + "\n"
                            + mind
                            + "]"
                        )
                        : "[" + partial.join(",") + "]";
                gap = mind;
                return v;
            }

// If the replacer is an array, use it to select the members to be stringified.

            if (rep && typeof rep === "object") {
                length = rep.length;
                for (i = 0; i < length; i += 1) {
                    if (typeof rep[i] === "string") {
                        k = rep[i];
                        v = str(k, value);
                        if (v) {
                            partial.push(quote(k) + (
                                (gap)
                                    ? ": "
                                    : ":"
                            ) + v);
                        }
                    }
                }
            } else {

// Otherwise, iterate through all of the keys in the object.

                for (k in value) {
                    if (Object.prototype.hasOwnProperty.call(value, k)) {
                        v = str(k, value);
                        if (v) {
                            partial.push(quote(k) + (
                                (gap)
                                    ? ": "
                                    : ":"
                            ) + v);
                        }
                    }
                }
            }

// Join all of the member texts together, separated with commas,
// and wrap them in braces.

            v = partial.length === 0
                ? "{}"
                : gap
                    ? "{\n" + gap + partial.join(",\n" + gap) + "\n" + mind + "}"
                    : "{" + partial.join(",") + "}";
            gap = mind;
            return v;
        }
    }

// If the JSON object does not yet have a stringify method, give it one.

    if (typeof JSON.stringify !== "function") {
        meta = {    // table of character substitutions
            "\b": "\\b",
            "\t": "\\t",
            "\n": "\\n",
            "\f": "\\f",
            "\r": "\\r",
            "\"": "\\\"",
            "\\": "\\\\"
        };
        JSON.stringify = function (value, replacer, space) {

// The stringify method takes a value and an optional replacer, and an optional
// space parameter, and returns a JSON text. The replacer can be a function
// that can replace values, or an array of strings that will select the keys.
// A default replacer method can be provided. Use of the space parameter can
// produce text that is more easily readable.

            var i;
            gap = "";
            indent = "";

// If the space parameter is a number, make an indent string containing that
// many spaces.

            if (typeof space === "number") {
                for (i = 0; i < space; i += 1) {
                    indent += " ";
                }

// If the space parameter is a string, it will be used as the indent string.

            } else if (typeof space === "string") {
                indent = space;
            }

// If there is a replacer, it must be a function or an array.
// Otherwise, throw an error.

            rep = replacer;
            if (replacer && typeof replacer !== "function" && (
                typeof replacer !== "object"
                || typeof replacer.length !== "number"
            )) {
                throw new Error("JSON.stringify");
            }

// Make a fake root object containing our value under the key of "".
// Return the result of stringifying the value.

            return str("", {"": value});
        };
    }


// If the JSON object does not yet have a parse method, give it one.

    if (typeof JSON.parse !== "function") {
        JSON.parse = function (text, reviver) {

// The parse method takes a text and an optional reviver function, and returns
// a JavaScript value if the text is a valid JSON text.

            var j;

            function walk(holder, key) {

// The walk method is used to recursively walk the resulting structure so
// that modifications can be made.

                var k;
                var v;
                var value = holder[key];
                if (value && typeof value === "object") {
                    for (k in value) {
                        if (Object.prototype.hasOwnProperty.call(value, k)) {
                            v = walk(value, k);
                            if (v !== undefined) {
                                value[k] = v;
                            } else {
                                delete value[k];
                            }
                        }
                    }
                }
                return reviver.call(holder, key, value);
            }


// Parsing happens in four stages. In the first stage, we replace certain
// Unicode characters with escape sequences. JavaScript handles many characters
// incorrectly, either silently deleting them, or treating them as line endings.

            text = String(text);
            rx_dangerous.lastIndex = 0;
            if (rx_dangerous.test(text)) {
                text = text.replace(rx_dangerous, function (a) {
                    return (
                        "\\u"
                        + ("0000" + a.charCodeAt(0).toString(16)).slice(-4)
                    );
                });
            }

// In the second stage, we run the text against regular expressions that look
// for non-JSON patterns. We are especially concerned with "()" and "new"
// because they can cause invocation, and "=" because it can cause mutation.
// But just to be safe, we want to reject all unexpected forms.

// We split the second stage into 4 regexp operations in order to work around
// crippling inefficiencies in IE's and Safari's regexp engines. First we
// replace the JSON backslash pairs with "@" (a non-JSON character). Second, we
// replace all simple value tokens with "]" characters. Third, we delete all
// open brackets that follow a colon or comma or that begin the text. Finally,
// we look to see that the remaining characters are only whitespace or "]" or
// "," or ":" or "{" or "}". If that is so, then the text is safe for eval.

            if (
                rx_one.test(
                    text
                        .replace(rx_two, "@")
                        .replace(rx_three, "]")
                        .replace(rx_four, "")
                )
            ) {

// In the third stage we use the eval function to compile the text into a
// JavaScript structure. The "{" operator is subject to a syntactic ambiguity
// in JavaScript: it can begin a block or an object literal. We wrap the text
// in parens to eliminate the ambiguity.

                j = eval("(" + text + ")");

// In the optional fourth stage, we recursively walk the new structure, passing
// each name/value pair to a reviver function for possible transformation.

                return (typeof reviver === "function")
                    ? walk({"": j}, "")
                    : j;
            }

// If the text is not JSON parseable, then a SyntaxError is thrown.

            throw new SyntaxError("JSON.parse");
        };
    }
}());

/**
 * SFX Browser — ExtendScript Backend (Premiere Pro)
 * Supports nested folders/bins at any depth, multi-track audio placement,
 * silence trimming, marker generation, and timeline placement.
 */

// ─── Helpers: Bin & Audio Detection ──────────────────────────────────────────

function isBin(item) {
    if (!item) return false;
    try {
        // Direct children collection check — only Bins have a children collection in Premiere Pro
        if (item.children && typeof item.children.numItems === "number") {
            return true;
        }
        // Type constant check (ProjectItemType.BIN is 2)
        if (typeof ProjectItemType !== "undefined" && item.type === ProjectItemType.BIN) {
            return true;
        }
        if (item.type === 2 || item.type === "BIN") {
            return true;
        }
    } catch (e) {}
    return false;
}

function isAudioFile(item, mediaPath) {
    if (!item) return false;

    // Check mediaType (if available)
    try {
        if (item.mediaType && String(item.mediaType).toLowerCase() === "audio") {
            return true;
        }
    } catch (e) {}

    var audioExts = [
        ".wav", ".mp3", ".m4a", ".aac", ".ogg", ".flac",
        ".aiff", ".aif", ".wma", ".mpeg", ".mpga", ".mp2",
        ".opus", ".ac3", ".caf"
    ];

    // Check item.name
    try {
        var name = (item.name || "").toLowerCase();
        for (var i = 0; i < audioExts.length; i++) {
            var ext = audioExts[i];
            if (name.length >= ext.length && name.lastIndexOf(ext) === name.length - ext.length) {
                return true;
            }
        }
    } catch (eName) {}

    // Check mediaPath (crucial if clip name doesn't include file extension in Premiere Pro)
    try {
        if (mediaPath) {
            var mPath = String(mediaPath).toLowerCase();
            for (var j = 0; j < audioExts.length; j++) {
                var ext2 = audioExts[j];
                if (mPath.length >= ext2.length && mPath.lastIndexOf(ext2) === mPath.length - ext2.length) {
                    return true;
                }
            }
        }
    } catch (ePath) {}

    return false;
}

// ─── Scan Project for Audio Files (Supports arbitrarily deep nested bins) ─────

function getAudioItems() {
    try {
        if (!app.project) {
            return JSON.stringify({ error: "No active project found in Premiere Pro. Please open a project." });
        }
        var root = app.project.rootItem;
        if (!root) {
            return JSON.stringify({ error: "Could not access Project Root in Premiere Pro." });
        }
        var results = [];
        scanFolder(root, "", results);
        return JSON.stringify(results);
    } catch (e) {
        return JSON.stringify({ error: "Error scanning project: " + e.toString() });
    }
}

function scanFolder(folder, parentPath, results) {
    if (!folder || !folder.children) return;

    var num = 0;
    try {
        num = folder.children.numItems;
    } catch (eNum) {
        return;
    }

    for (var i = 0; i < num; i++) {
        try {
            var item = folder.children[i];
            if (!item) continue;

            if (isBin(item)) {
                var binName = "";
                try { binName = item.name || "Folder"; } catch (eBN) { binName = "Folder"; }
                var currentBinPath = parentPath ? (parentPath + "/" + binName) : binName;
                // Recursive call for nested folders!
                scanFolder(item, currentBinPath, results);
            } else {
                var mediaPath = null;
                try {
                    mediaPath = item.getMediaPath();
                } catch (eMP) {}

                if (isAudioFile(item, mediaPath)) {
                    var safeMediaPath = "";
                    if (mediaPath) {
                        safeMediaPath = String(mediaPath).replace(/\\/g, "/");
                    }

                    var itemName = "";
                    try { itemName = item.name || "Audio"; } catch (eIN) { itemName = "Audio"; }

                    var treePath = "";
                    try { treePath = item.treePath || ""; } catch (eTP) {}

                    var nodeId = "";
                    try { nodeId = item.nodeId || ""; } catch (eNI) {}

                    results.push({
                        name: itemName,
                        treePath: treePath,
                        nodeId: nodeId,
                        binPath: parentPath || "root",
                        mediaPath: safeMediaPath
                    });
                }
            }
        } catch (itemErr) {
            // Protect loop from any single corrupt or non-standard item
        }
    }
}

// ─── Find Project Item (Supports nested bins, treePath, nodeId, mediaPath) ─────

function findItemByTreePath(treePath, nodeId, mediaPath) {
    if (!app.project || !app.project.rootItem) return null;
    return searchTreePath(app.project.rootItem, treePath, nodeId, mediaPath);
}

function searchTreePath(folder, treePath, nodeId, mediaPath) {
    if (!folder || !folder.children) return null;
    var normTree = treePath ? String(treePath).replace(/\\/g, "/").toLowerCase() : "";
    var normMedia = mediaPath ? String(mediaPath).replace(/\\/g, "/").toLowerCase() : "";

    for (var i = 0; i < folder.children.numItems; i++) {
        try {
            var item = folder.children[i];
            if (!item) continue;

            // 1. Check nodeId
            if (nodeId && item.nodeId && String(item.nodeId) === String(nodeId)) {
                return item;
            }

            // 2. Check treePath
            if (normTree && item.treePath) {
                var itTree = String(item.treePath).replace(/\\/g, "/").toLowerCase();
                if (itTree === normTree) {
                    return item;
                }
            }

            // 3. Check mediaPath
            if (normMedia) {
                try {
                    var mp = item.getMediaPath();
                    if (mp && String(mp).replace(/\\/g, "/").toLowerCase() === normMedia) {
                        return item;
                    }
                } catch (eM) {}
            }

            // 4. Check name if treePath matches name
            if (normTree && item.name && item.name.toLowerCase() === normTree) {
                return item;
            }

            // 5. If bin, search recursively into nested bin!
            if (isBin(item)) {
                var found = searchTreePath(item, treePath, nodeId, mediaPath);
                if (found) return found;
            }
        } catch (eSearch) {}
    }
    return null;
}

// ─── Get Media File Path ───────────────────────────────────────────────────────

function getMediaPath(treePath, nodeId, mediaPath) {
    var item = findItemByTreePath(treePath, nodeId, mediaPath);
    if (item) {
        try {
            var p = item.getMediaPath();
            return p ? p.replace(/\\/g, "/") : null;
        } catch (e) {
            return null;
        }
    }
    return null;
}

// ─── Insert Audio at Playhead (with auto-track if overlap) ─────────────────────

function insertAudioAtPlayhead(treePath, trackIdx, silenceOffset, nodeId, mediaPath) {
    try {
        var seq = app.project.activeSequence;
        if (!seq) {
            return "ERROR: No active sequence found in Premiere Pro. Please open a sequence.";
        }

        var projectItem = findItemByTreePath(treePath, nodeId, mediaPath);
        if (!projectItem) {
            return "ERROR: Could not find item in project: " + treePath;
        }

        var playheadTime = seq.getPlayerPosition();
        var playheadSec = ticksToSeconds(playheadTime.ticks);

        // Find a free track starting from the preferred trackIdx
        var usedTrack = findFreeAudioTrack(seq, trackIdx, playheadSec);
        if (usedTrack === -1) {
            return "ERROR: No free audio track available at playhead";
        }

        var targetTrack = seq.audioTracks[usedTrack];

        // Insert clip at playhead
        targetTrack.insertClip(projectItem, playheadTime);

        // Apply silence trim if offset > 0
        if (silenceOffset && silenceOffset > 0) {
            trimClipStart(targetTrack, playheadTime, silenceOffset);
        }

        var trackLabel = "A" + (usedTrack + 1);
        return "OK|" + trackLabel;

    } catch (e) {
        return "ERROR: " + e.message;
    }
}

// ─── Find free audio track (no overlap at playhead) ────────────────────────────

function findFreeAudioTrack(seq, preferredIdx, playheadSec) {
    // Try the preferred track first
    if (preferredIdx >= 0 && preferredIdx < seq.audioTracks.numTracks) {
        if (!hasClipAtTime(seq.audioTracks[preferredIdx], playheadSec)) {
            return preferredIdx;
        }
    }

    // Preferred track is occupied — scan all tracks from preferredIdx onward
    for (var t = preferredIdx + 1; t < seq.audioTracks.numTracks; t++) {
        if (!hasClipAtTime(seq.audioTracks[t], playheadSec)) {
            return t;
        }
    }

    // Also try tracks before preferredIdx (wrap around)
    for (var t = 0; t < preferredIdx; t++) {
        if (!hasClipAtTime(seq.audioTracks[t], playheadSec)) {
            return t;
        }
    }

    // All tracks occupied — return preferred anyway (will overlay)
    return preferredIdx;
}

function hasClipAtTime(track, timeSec) {
    var clips = track.clips;
    for (var i = 0; i < clips.numItems; i++) {
        var clip = clips[i];
        var clipStart = ticksToSeconds(clip.start.ticks);
        var clipEnd = ticksToSeconds(clip.end.ticks);

        // Check if playhead falls within this clip's range
        if (timeSec >= clipStart && timeSec < clipEnd) {
            return true;
        }
    }
    return false;
}

// ─── Trim silence from inserted clip ───────────────────────────────────────────

function trimClipStart(track, insertTime, silenceOffset) {
    try {
        var clips = track.clips;
        var targetClip = null;
        var insertTimeSec = ticksToSeconds(insertTime.ticks);

        for (var i = 0; i < clips.numItems; i++) {
            var clip = clips[i];
            var clipStartSec = ticksToSeconds(clip.start.ticks);

            if (Math.abs(clipStartSec - insertTimeSec) < 0.05) {
                targetClip = clip;
                break;
            }
        }

        if (!targetClip) return;

        var currentInTicks = parseInt(targetClip.inPoint.ticks);
        var offsetTicks = Math.round(silenceOffset * TICKS_PER_SECOND);
        var newInTicks = currentInTicks + offsetTicks;

        var newInPoint = targetClip.inPoint;
        newInPoint.ticks = String(newInTicks);
        targetClip.inPoint = newInPoint;

    } catch (e) {
        // Silence trimming is best-effort
    }
}

// ─── Set In/Out Range on Project Item (Source Media Non-destructive Trim) ─────

function setProjectItemRange(projectItem, inSec, outSec) {
    if (!projectItem) return;
    try {
        var TICKS_PER_SECOND = 254016000000;
        inSec = parseFloat(inSec) || 0;
        outSec = parseFloat(outSec) || 0;

        if (typeof projectItem.setInPoint === "function") {
            try {
                var inTime = new Time();
                inTime.ticks = String(Math.round(inSec * TICKS_PER_SECOND));
                projectItem.setInPoint(inTime, 2);
            } catch (eIn1) {
                try { projectItem.setInPoint(inSec, 2); } catch (eIn2) {}
            }
        }

        if (typeof projectItem.setOutPoint === "function" && outSec > inSec) {
            try {
                var outTime = new Time();
                outTime.ticks = String(Math.round(outSec * TICKS_PER_SECOND));
                projectItem.setOutPoint(outTime, 2);
            } catch (eOut1) {
                try { projectItem.setOutPoint(outSec, 2); } catch (eOut2) {}
            }
        }
    } catch (ePrj) {}
}

function setProjectItemRangeFromPanel(treePath, inSec, outSec, nodeId, mediaPath) {
    try {
        var item = findItemByTreePath(treePath, nodeId, mediaPath);
        if (!item) return "ERROR: Item not found";
        setProjectItemRange(item, inSec, outSec);
        return "OK";
    } catch (e) {
        return "ERROR: " + e.message;
    }
}

// ─── Insert Audio Range at Playhead ───────────────────────────────────────────

function insertAudioRangeAtPlayhead(treePath, trackIdx, inSec, outSec, nodeId, mediaPath) {
    try {
        var seq = app.project.activeSequence;
        if (!seq) {
            return "ERROR: No active sequence found in Premiere Pro. Please open a sequence.";
        }

        var projectItem = findItemByTreePath(treePath, nodeId, mediaPath);
        if (!projectItem) {
            return "ERROR: Could not find item in project: " + treePath;
        }

        var playheadTime = seq.getPlayerPosition();
        var playheadSec = ticksToSeconds(playheadTime.ticks);

        // Find a free track starting from the preferred trackIdx
        var usedTrack = findFreeAudioTrack(seq, trackIdx, playheadSec);
        if (usedTrack === -1) {
            return "ERROR: No free audio track available at playhead";
        }

        var targetTrack = seq.audioTracks[usedTrack];

        inSec = parseFloat(inSec) || 0;
        outSec = parseFloat(outSec) || 0;

        // Set ProjectItem In and Out if range is specified
        if (inSec > 0 || outSec > 0) {
            setProjectItemRange(projectItem, inSec, outSec);
        }

        // Insert clip at playhead
        targetTrack.insertClip(projectItem, playheadTime);

        // Ensure track item on sequence timeline matches exact In and Out
        if (inSec > 0 || outSec > 0) {
            trimClipRange(targetTrack, playheadTime, inSec, outSec);
        }

        var trackLabel = "A" + (usedTrack + 1);
        var rangeLabel = "";
        if (inSec > 0 || outSec > 0) {
            rangeLabel = " (" + inSec.toFixed(2) + "s - " + outSec.toFixed(2) + "s)";
        }
        return "OK|" + trackLabel + "|" + rangeLabel;

    } catch (e) {
        return "ERROR: " + e.message;
    }
}

// ─── Import & Place Audio File Directly at Playhead ───────────────────────────

function importAndPlaceAudioFile(filePath, trackIdx) {
    try {
        var seq = app.project.activeSequence;
        if (!seq) {
            return "ERROR: No active sequence open in Premiere Pro. Please open a sequence.";
        }

        var cleanPath = String(filePath).replace(/\\/g, "/");
        var f = new File(cleanPath);
        if (!f.exists) {
            return "ERROR: Audio file does not exist on disk: " + cleanPath;
        }

        var root = app.project.rootItem;
        var cutBinName = "SFX Cuts";
        var targetBin = null;
        for (var b = 0; b < root.children.numItems; b++) {
            var ch = root.children[b];
            if (isBin(ch) && ch.name === cutBinName) {
                targetBin = ch;
                break;
            }
        }
        if (!targetBin) {
            try { targetBin = root.createBin(cutBinName); } catch (eBin) { targetBin = root; }
        }

        app.project.importFiles([cleanPath], true, targetBin, false);

        var projectItem = null;
        for (var i = 0; i < targetBin.children.numItems; i++) {
            var item = targetBin.children[i];
            try {
                var mp = item.getMediaPath();
                if (mp && String(mp).replace(/\\/g, "/").toLowerCase() === cleanPath.toLowerCase()) {
                    projectItem = item;
                    break;
                }
            } catch (eMp) {}
        }

        if (!projectItem) {
            projectItem = findItemByTreePath("", "", cleanPath);
        }

        if (!projectItem) {
            return "ERROR: Failed to locate imported clip in project.";
        }

        var playheadTime = seq.getPlayerPosition();
        var playheadSec = ticksToSeconds(playheadTime.ticks);

        var usedTrack = findFreeAudioTrack(seq, trackIdx, playheadSec);
        if (usedTrack === -1) {
            return "ERROR: No free audio track available at playhead";
        }

        var targetTrack = seq.audioTracks[usedTrack];
        targetTrack.insertClip(projectItem, playheadTime);

        var trackLabel = "A" + (usedTrack + 1);
        return "OK|" + trackLabel;

    } catch (e) {
        return "ERROR: " + e.message;
    }
}

function trimClipRange(track, insertTime, inSec, outSec) {
    try {
        var clips = track.clips;
        var targetClip = null;
        var insertTimeSec = ticksToSeconds(insertTime.ticks);

        for (var i = 0; i < clips.numItems; i++) {
            var clip = clips[i];
            var clipStartSec = ticksToSeconds(clip.start.ticks);

            if (Math.abs(clipStartSec - insertTimeSec) < 0.05) {
                targetClip = clip;
                break;
            }
        }

        if (!targetClip) return;

        var TICKS_PER_SECOND = 254016000000;
        var baseInTicks = parseInt(targetClip.inPoint.ticks);
        var baseOutTicks = parseInt(targetClip.outPoint.ticks);

        if (inSec > 0) {
            var newInTicks = baseInTicks + Math.round(inSec * TICKS_PER_SECOND);
            var inPt = targetClip.inPoint;
            inPt.ticks = String(newInTicks);
            targetClip.inPoint = inPt;
        }

        if (outSec > inSec) {
            var newOutTicks = baseInTicks + Math.round(outSec * TICKS_PER_SECOND);
            if (newOutTicks < baseOutTicks) {
                var outPt = targetClip.outPoint;
                outPt.ticks = String(newOutTicks);
                targetClip.outPoint = outPt;
            }
        }
    } catch (e) {}
}

// ─── Audio Gain ────────────────────────────────────────────────────────────────

function setAudioGain(linearValue) {
    try {
        var seq = app.project.activeSequence;
        if (!seq) {
            return "ERROR: No active sequence";
        }

        var count = 0;

        // Apply to selected clips across all audio tracks
        for (var t = 0; t < seq.audioTracks.numTracks; t++) {
            var track = seq.audioTracks[t];
            var clips = track.clips;

            for (var c = 0; c < clips.numItems; c++) {
                var clip = clips[c];
                if (clip.isSelected()) {
                    try {
                        var components = clip.components;
                        for (var i = 0; i < components.numItems; i++) {
                            var comp = components[i];
                            if (comp.displayName === "Volume") {
                                var props = comp.properties;
                                for (var p = 0; p < props.numItems; p++) {
                                    var prop = props[p];
                                    if (prop.displayName === "Level") {
                                        prop.setValue(linearValue, true);
                                        count++;
                                    }
                                }
                            }
                        }
                    } catch (clipErr) {}
                }
            }
        }

        if (count > 0) {
            return "OK|" + count;
        } else {
            return "ERROR: No selected audio clips found";
        }

    } catch (e) {
        return "ERROR: " + e.message;
    }
}

// ─── Tick Conversion ───────────────────────────────────────────────────────────

var TICKS_PER_SECOND = 254016000000;

function ticksToSeconds(ticks) {
    return parseInt(ticks) / TICKS_PER_SECOND;
}

// ─── Timeline Markers Creation ("Paste Timeline") ─────────────────────────────

function createTimelineMarkers(jsonString) {
    try {
        if (!app.project) {
            return JSON.stringify({ success: false, message: "No active project found." });
        }
        var seq = app.project.activeSequence;
        if (!seq) {
            return JSON.stringify({ success: false, message: "No active sequence found in Premiere Pro. Please open a sequence." });
        }

        var data = null;
        try {
            data = (typeof JSON !== "undefined" && JSON.parse) ? JSON.parse(jsonString) : eval("(" + jsonString + ")");
        } catch (eParse) {
            return JSON.stringify({ success: false, message: "Failed to parse marker data: " + eParse.message });
        }

        var markersList = data.markers || [];
        var clearExisting = data.clearExisting || false;
        var defaultColor = (typeof data.colorIndex === "number") ? data.colorIndex : 7; // 7 = Cyan

        if (!markersList || markersList.length === 0) {
            return JSON.stringify({ success: false, message: "No marker cues provided." });
        }

        // Clear existing markers if requested
        if (clearExisting) {
            try {
                var firstM = seq.markers.getFirstMarker();
                while (firstM) {
                    seq.markers.deleteMarker(firstM);
                    firstM = seq.markers.getFirstMarker();
                }
            } catch (eDel) {}
        }

        var createdCount = 0;
        var firstStartTicks = null;

        for (var i = 0; i < markersList.length; i++) {
            var item = markersList[i];
            var startSec = parseFloat(item.startSec);
            if (isNaN(startSec) || startSec < 0) continue;

            var marker = seq.markers.createMarker(startSec);
            if (!marker) continue;

            if (item.name) {
                marker.name = String(item.name);
            } else {
                marker.name = "Music " + (i + 1);
            }

            if (item.comment) {
                marker.comments = String(item.comment);
            }

            var endSec = parseFloat(item.endSec);
            if (!isNaN(endSec) && endSec > startSec) {
                try {
                    marker.end = endSec;
                } catch (eEnd) {}
            }

            var colorIdx = (typeof item.colorIndex === "number") ? item.colorIndex : defaultColor;
            try {
                marker.setColorByIndex(colorIdx);
            } catch (eCol) {}

            createdCount++;

            var markerTicks = Math.round(startSec * TICKS_PER_SECOND);
            if (firstStartTicks === null || markerTicks < firstStartTicks) {
                firstStartTicks = markerTicks;
            }
        }

        // Move playhead to first marker
        if (firstStartTicks !== null) {
            try {
                seq.setPlayerPosition(String(firstStartTicks));
            } catch (ePos) {}
        }

        return JSON.stringify({
            success: true,
            createdCount: createdCount,
            sequenceName: seq.name,
            message: "Successfully created " + createdCount + " marker(s) on sequence \"" + seq.name + "\"."
        });

    } catch (e) {
        return JSON.stringify({ success: false, message: "ERROR: " + e.message });
    }
}

// ─── AE Timeline Footage Placement Support ─────────────────────────────────────

function getSequenceInfo() {
    if (!app.project) return JSON.stringify({ error: "No project open" });
    var seq = app.project.activeSequence;
    if (!seq) return JSON.stringify({ error: "No active sequence in Premiere Pro" });

    var projPath = "";
    try {
        if (app.project.file && app.project.file.exists) {
            projPath = app.project.file.parent.fsName.replace(/\\/g, "/");
        }
    } catch (e) {}

    return JSON.stringify({
        sequenceName: seq.name,
        numVideoTracks: seq.videoTracks.numTracks,
        numAudioTracks: seq.audioTracks.numTracks,
        zeroPoint: seq.zeroPoint,
        projectFolder: projPath
    });
}

function getProjectDraftFolder() {
    try {
        if (app.project && app.project.file && app.project.file.exists) {
            var draftF = new Folder(app.project.file.parent.fsName + "/Draft");
            if (draftF.exists) {
                return draftF.fsName.replace(/\\/g, "/");
            }
            return app.project.file.parent.fsName.replace(/\\/g, "/");
        }
    } catch (e) {}
    return "";
}

function placeFootageFromJSON(jsonString) {
    if (!app.project) {
        return JSON.stringify({ success: false, message: "No active project found." });
    }
    var seq = app.project.activeSequence;
    if (!seq) {
        return JSON.stringify({ success: false, message: "No active sequence found. Please open your sequence." });
    }

    var timingData = null;
    try {
        timingData = (typeof JSON !== "undefined" && JSON.parse) ? JSON.parse(jsonString) : eval("(" + jsonString + ")");
    } catch (eParse) {
        return JSON.stringify({ success: false, message: "Invalid JSON data: " + eParse.message });
    }

    var items = (timingData && timingData.items) ? timingData.items : timingData;
    if (!items || !(items instanceof Array) || items.length === 0) {
        return JSON.stringify({ success: false, message: "No footage items found in data." });
    }

    var zeroTicks = 0;
    try {
        zeroTicks = parseInt(seq.zeroPoint, 10) || 0;
    } catch (eZ) {
        zeroTicks = 0;
    }

    var binName = "_BatchRendered_Draft";
    var draftBin = null;
    try {
        var root = app.project.rootItem;
        for (var b = 0; b < root.children.numItems; b++) {
            var child = root.children[b];
            if (isBin(child) && child.name === binName) {
                draftBin = child;
                break;
            }
        }
        if (!draftBin) {
            draftBin = root.createBin(binName);
        }
    } catch (eBin) {
        draftBin = app.project.rootItem;
    }

    function findProjectItem(absPath) {
        var normTarget = absPath.replace(/\\/g, "/").toLowerCase();
        function searchFolder(folder, target) {
            for (var i = 0; i < folder.children.numItems; i++) {
                var it = folder.children[i];
                if (isBin(it)) {
                    var found = searchFolder(it, target);
                    if (found) return found;
                } else {
                    try {
                        var mp = it.getMediaPath();
                        if (mp && mp.replace(/\\/g, "/").toLowerCase() === target) {
                            return it;
                        }
                    } catch (eMP) {}
                }
            }
            return null;
        }
        return searchFolder(app.project.rootItem, normTarget);
    }

    var filesToImport = [];
    for (var i = 0; i < items.length; i++) {
        var tItem = items[i];
        var testFile = new File(tItem.filePath);
        if (!testFile.exists) {
            try {
                var pDir = testFile.parent;
                if (pDir && pDir.exists) {
                    var flist = pDir.getFiles("*" + tItem.sourceCompName + "*");
                    if (flist && flist.length > 0) {
                        tItem.filePath = flist[0].fsName;
                        tItem.fileName = flist[0].name;
                        testFile = flist[0];
                    }
                }
            } catch (eScan) {}
        }
        if (!testFile.exists) continue;

        var existing = findProjectItem(tItem.filePath);
        if (!existing) {
            filesToImport.push(tItem.filePath);
        }
    }

    if (filesToImport.length > 0) {
        try {
            app.project.importFiles(filesToImport, true, draftBin, false);
        } catch (eImp) {}
    }

    var vTracks = seq.videoTracks;
    var topVIdx = vTracks.numTracks - 1;
    if (topVIdx < 0) {
        return JSON.stringify({ success: false, message: "Active sequence has no video tracks." });
    }

    var topVTrack = vTracks[topVIdx];
    var needNewVTrack = (topVTrack.clips.numItems > 0);

    if (needNewVTrack) {
        try {
            app.enableQE();
            if (typeof qe !== "undefined" && qe.project) {
                var qeSeq = qe.project.getActiveSequence();
                if (qeSeq && qeSeq.addTracks) qeSeq.addTracks(1);
            }
        } catch (eAddV) {}
        vTracks = seq.videoTracks;
        topVIdx = vTracks.numTracks - 1;
        topVTrack = vTracks[topVIdx];
    }

    while (seq.audioTracks.numTracks < 3) {
        try {
            app.enableQE();
            if (typeof qe !== "undefined" && qe.project) {
                var qeSeqA = qe.project.getActiveSequence();
                if (qeSeqA && qeSeqA.addTracks) qeSeqA.addTracks(0);
            }
        } catch (eAddA) { break; }
    }

    var placedCount = 0;
    for (var p = 0; p < items.length; p++) {
        var itm = items[p];
        var pItem = findProjectItem(itm.filePath);
        if (!pItem) continue;

        var clipStartTicks = zeroTicks + Math.round(itm.startTimeSeconds * TICKS_PER_SECOND);
        var clipStartSec = clipStartTicks / TICKS_PER_SECOND;

        try {
            var timeObj = new Time();
            timeObj.seconds = clipStartSec;
            topVTrack.overwriteClip(pItem, timeObj);
            placedCount++;
        } catch (eOvr) {
            try {
                topVTrack.overwriteClip(pItem, clipStartSec);
                placedCount++;
            } catch (eOvr2) {}
        }
    }

    return JSON.stringify({
        success: true,
        placedCount: placedCount,
        totalCount: items.length,
        videoTrack: "V" + (topVIdx + 1),
        message: "Placed " + placedCount + " of " + items.length + " clips in active sequence (" + seq.name + ")."
    });
}
