#!/usr/bin/env node
import { createRequire as __nodeCreateRequire } from 'node:module';
const require = __nodeCreateRequire(import.meta.url);
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __commonJS = (cb, mod) => function __require2() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// ../../node_modules/.pnpm/commander@13.1.0/node_modules/commander/lib/error.js
var require_error = __commonJS({
  "../../node_modules/.pnpm/commander@13.1.0/node_modules/commander/lib/error.js"(exports) {
    "use strict";
    var CommanderError2 = class extends Error {
      /**
       * Constructs the CommanderError class
       * @param {number} exitCode suggested exit code which could be used with process.exit
       * @param {string} code an id string representing the error
       * @param {string} message human-readable description of the error
       */
      constructor(exitCode, code, message) {
        super(message);
        Error.captureStackTrace(this, this.constructor);
        this.name = this.constructor.name;
        this.code = code;
        this.exitCode = exitCode;
        this.nestedError = void 0;
      }
    };
    var InvalidArgumentError2 = class extends CommanderError2 {
      /**
       * Constructs the InvalidArgumentError class
       * @param {string} [message] explanation of why argument is invalid
       */
      constructor(message) {
        super(1, "commander.invalidArgument", message);
        Error.captureStackTrace(this, this.constructor);
        this.name = this.constructor.name;
      }
    };
    exports.CommanderError = CommanderError2;
    exports.InvalidArgumentError = InvalidArgumentError2;
  }
});

// ../../node_modules/.pnpm/commander@13.1.0/node_modules/commander/lib/argument.js
var require_argument = __commonJS({
  "../../node_modules/.pnpm/commander@13.1.0/node_modules/commander/lib/argument.js"(exports) {
    "use strict";
    var { InvalidArgumentError: InvalidArgumentError2 } = require_error();
    var Argument2 = class {
      /**
       * Initialize a new command argument with the given name and description.
       * The default is that the argument is required, and you can explicitly
       * indicate this with <> around the name. Put [] around the name for an optional argument.
       *
       * @param {string} name
       * @param {string} [description]
       */
      constructor(name, description) {
        this.description = description || "";
        this.variadic = false;
        this.parseArg = void 0;
        this.defaultValue = void 0;
        this.defaultValueDescription = void 0;
        this.argChoices = void 0;
        switch (name[0]) {
          case "<":
            this.required = true;
            this._name = name.slice(1, -1);
            break;
          case "[":
            this.required = false;
            this._name = name.slice(1, -1);
            break;
          default:
            this.required = true;
            this._name = name;
            break;
        }
        if (this._name.length > 3 && this._name.slice(-3) === "...") {
          this.variadic = true;
          this._name = this._name.slice(0, -3);
        }
      }
      /**
       * Return argument name.
       *
       * @return {string}
       */
      name() {
        return this._name;
      }
      /**
       * @package
       */
      _concatValue(value, previous) {
        if (previous === this.defaultValue || !Array.isArray(previous)) {
          return [value];
        }
        return previous.concat(value);
      }
      /**
       * Set the default value, and optionally supply the description to be displayed in the help.
       *
       * @param {*} value
       * @param {string} [description]
       * @return {Argument}
       */
      default(value, description) {
        this.defaultValue = value;
        this.defaultValueDescription = description;
        return this;
      }
      /**
       * Set the custom handler for processing CLI command arguments into argument values.
       *
       * @param {Function} [fn]
       * @return {Argument}
       */
      argParser(fn) {
        this.parseArg = fn;
        return this;
      }
      /**
       * Only allow argument value to be one of choices.
       *
       * @param {string[]} values
       * @return {Argument}
       */
      choices(values) {
        this.argChoices = values.slice();
        this.parseArg = (arg, previous) => {
          if (!this.argChoices.includes(arg)) {
            throw new InvalidArgumentError2(
              `Allowed choices are ${this.argChoices.join(", ")}.`
            );
          }
          if (this.variadic) {
            return this._concatValue(arg, previous);
          }
          return arg;
        };
        return this;
      }
      /**
       * Make argument required.
       *
       * @returns {Argument}
       */
      argRequired() {
        this.required = true;
        return this;
      }
      /**
       * Make argument optional.
       *
       * @returns {Argument}
       */
      argOptional() {
        this.required = false;
        return this;
      }
    };
    function humanReadableArgName(arg) {
      const nameOutput = arg.name() + (arg.variadic === true ? "..." : "");
      return arg.required ? "<" + nameOutput + ">" : "[" + nameOutput + "]";
    }
    exports.Argument = Argument2;
    exports.humanReadableArgName = humanReadableArgName;
  }
});

// ../../node_modules/.pnpm/commander@13.1.0/node_modules/commander/lib/help.js
var require_help = __commonJS({
  "../../node_modules/.pnpm/commander@13.1.0/node_modules/commander/lib/help.js"(exports) {
    "use strict";
    var { humanReadableArgName } = require_argument();
    var Help2 = class {
      constructor() {
        this.helpWidth = void 0;
        this.minWidthToWrap = 40;
        this.sortSubcommands = false;
        this.sortOptions = false;
        this.showGlobalOptions = false;
      }
      /**
       * prepareContext is called by Commander after applying overrides from `Command.configureHelp()`
       * and just before calling `formatHelp()`.
       *
       * Commander just uses the helpWidth and the rest is provided for optional use by more complex subclasses.
       *
       * @param {{ error?: boolean, helpWidth?: number, outputHasColors?: boolean }} contextOptions
       */
      prepareContext(contextOptions) {
        this.helpWidth = this.helpWidth ?? contextOptions.helpWidth ?? 80;
      }
      /**
       * Get an array of the visible subcommands. Includes a placeholder for the implicit help command, if there is one.
       *
       * @param {Command} cmd
       * @returns {Command[]}
       */
      visibleCommands(cmd) {
        const visibleCommands = cmd.commands.filter((cmd2) => !cmd2._hidden);
        const helpCommand = cmd._getHelpCommand();
        if (helpCommand && !helpCommand._hidden) {
          visibleCommands.push(helpCommand);
        }
        if (this.sortSubcommands) {
          visibleCommands.sort((a, b) => {
            return a.name().localeCompare(b.name());
          });
        }
        return visibleCommands;
      }
      /**
       * Compare options for sort.
       *
       * @param {Option} a
       * @param {Option} b
       * @returns {number}
       */
      compareOptions(a, b) {
        const getSortKey = (option) => {
          return option.short ? option.short.replace(/^-/, "") : option.long.replace(/^--/, "");
        };
        return getSortKey(a).localeCompare(getSortKey(b));
      }
      /**
       * Get an array of the visible options. Includes a placeholder for the implicit help option, if there is one.
       *
       * @param {Command} cmd
       * @returns {Option[]}
       */
      visibleOptions(cmd) {
        const visibleOptions = cmd.options.filter((option) => !option.hidden);
        const helpOption = cmd._getHelpOption();
        if (helpOption && !helpOption.hidden) {
          const removeShort = helpOption.short && cmd._findOption(helpOption.short);
          const removeLong = helpOption.long && cmd._findOption(helpOption.long);
          if (!removeShort && !removeLong) {
            visibleOptions.push(helpOption);
          } else if (helpOption.long && !removeLong) {
            visibleOptions.push(
              cmd.createOption(helpOption.long, helpOption.description)
            );
          } else if (helpOption.short && !removeShort) {
            visibleOptions.push(
              cmd.createOption(helpOption.short, helpOption.description)
            );
          }
        }
        if (this.sortOptions) {
          visibleOptions.sort(this.compareOptions);
        }
        return visibleOptions;
      }
      /**
       * Get an array of the visible global options. (Not including help.)
       *
       * @param {Command} cmd
       * @returns {Option[]}
       */
      visibleGlobalOptions(cmd) {
        if (!this.showGlobalOptions) return [];
        const globalOptions = [];
        for (let ancestorCmd = cmd.parent; ancestorCmd; ancestorCmd = ancestorCmd.parent) {
          const visibleOptions = ancestorCmd.options.filter(
            (option) => !option.hidden
          );
          globalOptions.push(...visibleOptions);
        }
        if (this.sortOptions) {
          globalOptions.sort(this.compareOptions);
        }
        return globalOptions;
      }
      /**
       * Get an array of the arguments if any have a description.
       *
       * @param {Command} cmd
       * @returns {Argument[]}
       */
      visibleArguments(cmd) {
        if (cmd._argsDescription) {
          cmd.registeredArguments.forEach((argument) => {
            argument.description = argument.description || cmd._argsDescription[argument.name()] || "";
          });
        }
        if (cmd.registeredArguments.find((argument) => argument.description)) {
          return cmd.registeredArguments;
        }
        return [];
      }
      /**
       * Get the command term to show in the list of subcommands.
       *
       * @param {Command} cmd
       * @returns {string}
       */
      subcommandTerm(cmd) {
        const args = cmd.registeredArguments.map((arg) => humanReadableArgName(arg)).join(" ");
        return cmd._name + (cmd._aliases[0] ? "|" + cmd._aliases[0] : "") + (cmd.options.length ? " [options]" : "") + // simplistic check for non-help option
        (args ? " " + args : "");
      }
      /**
       * Get the option term to show in the list of options.
       *
       * @param {Option} option
       * @returns {string}
       */
      optionTerm(option) {
        return option.flags;
      }
      /**
       * Get the argument term to show in the list of arguments.
       *
       * @param {Argument} argument
       * @returns {string}
       */
      argumentTerm(argument) {
        return argument.name();
      }
      /**
       * Get the longest command term length.
       *
       * @param {Command} cmd
       * @param {Help} helper
       * @returns {number}
       */
      longestSubcommandTermLength(cmd, helper) {
        return helper.visibleCommands(cmd).reduce((max, command) => {
          return Math.max(
            max,
            this.displayWidth(
              helper.styleSubcommandTerm(helper.subcommandTerm(command))
            )
          );
        }, 0);
      }
      /**
       * Get the longest option term length.
       *
       * @param {Command} cmd
       * @param {Help} helper
       * @returns {number}
       */
      longestOptionTermLength(cmd, helper) {
        return helper.visibleOptions(cmd).reduce((max, option) => {
          return Math.max(
            max,
            this.displayWidth(helper.styleOptionTerm(helper.optionTerm(option)))
          );
        }, 0);
      }
      /**
       * Get the longest global option term length.
       *
       * @param {Command} cmd
       * @param {Help} helper
       * @returns {number}
       */
      longestGlobalOptionTermLength(cmd, helper) {
        return helper.visibleGlobalOptions(cmd).reduce((max, option) => {
          return Math.max(
            max,
            this.displayWidth(helper.styleOptionTerm(helper.optionTerm(option)))
          );
        }, 0);
      }
      /**
       * Get the longest argument term length.
       *
       * @param {Command} cmd
       * @param {Help} helper
       * @returns {number}
       */
      longestArgumentTermLength(cmd, helper) {
        return helper.visibleArguments(cmd).reduce((max, argument) => {
          return Math.max(
            max,
            this.displayWidth(
              helper.styleArgumentTerm(helper.argumentTerm(argument))
            )
          );
        }, 0);
      }
      /**
       * Get the command usage to be displayed at the top of the built-in help.
       *
       * @param {Command} cmd
       * @returns {string}
       */
      commandUsage(cmd) {
        let cmdName = cmd._name;
        if (cmd._aliases[0]) {
          cmdName = cmdName + "|" + cmd._aliases[0];
        }
        let ancestorCmdNames = "";
        for (let ancestorCmd = cmd.parent; ancestorCmd; ancestorCmd = ancestorCmd.parent) {
          ancestorCmdNames = ancestorCmd.name() + " " + ancestorCmdNames;
        }
        return ancestorCmdNames + cmdName + " " + cmd.usage();
      }
      /**
       * Get the description for the command.
       *
       * @param {Command} cmd
       * @returns {string}
       */
      commandDescription(cmd) {
        return cmd.description();
      }
      /**
       * Get the subcommand summary to show in the list of subcommands.
       * (Fallback to description for backwards compatibility.)
       *
       * @param {Command} cmd
       * @returns {string}
       */
      subcommandDescription(cmd) {
        return cmd.summary() || cmd.description();
      }
      /**
       * Get the option description to show in the list of options.
       *
       * @param {Option} option
       * @return {string}
       */
      optionDescription(option) {
        const extraInfo = [];
        if (option.argChoices) {
          extraInfo.push(
            // use stringify to match the display of the default value
            `choices: ${option.argChoices.map((choice) => JSON.stringify(choice)).join(", ")}`
          );
        }
        if (option.defaultValue !== void 0) {
          const showDefault = option.required || option.optional || option.isBoolean() && typeof option.defaultValue === "boolean";
          if (showDefault) {
            extraInfo.push(
              `default: ${option.defaultValueDescription || JSON.stringify(option.defaultValue)}`
            );
          }
        }
        if (option.presetArg !== void 0 && option.optional) {
          extraInfo.push(`preset: ${JSON.stringify(option.presetArg)}`);
        }
        if (option.envVar !== void 0) {
          extraInfo.push(`env: ${option.envVar}`);
        }
        if (extraInfo.length > 0) {
          return `${option.description} (${extraInfo.join(", ")})`;
        }
        return option.description;
      }
      /**
       * Get the argument description to show in the list of arguments.
       *
       * @param {Argument} argument
       * @return {string}
       */
      argumentDescription(argument) {
        const extraInfo = [];
        if (argument.argChoices) {
          extraInfo.push(
            // use stringify to match the display of the default value
            `choices: ${argument.argChoices.map((choice) => JSON.stringify(choice)).join(", ")}`
          );
        }
        if (argument.defaultValue !== void 0) {
          extraInfo.push(
            `default: ${argument.defaultValueDescription || JSON.stringify(argument.defaultValue)}`
          );
        }
        if (extraInfo.length > 0) {
          const extraDescription = `(${extraInfo.join(", ")})`;
          if (argument.description) {
            return `${argument.description} ${extraDescription}`;
          }
          return extraDescription;
        }
        return argument.description;
      }
      /**
       * Generate the built-in help text.
       *
       * @param {Command} cmd
       * @param {Help} helper
       * @returns {string}
       */
      formatHelp(cmd, helper) {
        const termWidth = helper.padWidth(cmd, helper);
        const helpWidth = helper.helpWidth ?? 80;
        function callFormatItem(term, description) {
          return helper.formatItem(term, termWidth, description, helper);
        }
        let output = [
          `${helper.styleTitle("Usage:")} ${helper.styleUsage(helper.commandUsage(cmd))}`,
          ""
        ];
        const commandDescription = helper.commandDescription(cmd);
        if (commandDescription.length > 0) {
          output = output.concat([
            helper.boxWrap(
              helper.styleCommandDescription(commandDescription),
              helpWidth
            ),
            ""
          ]);
        }
        const argumentList = helper.visibleArguments(cmd).map((argument) => {
          return callFormatItem(
            helper.styleArgumentTerm(helper.argumentTerm(argument)),
            helper.styleArgumentDescription(helper.argumentDescription(argument))
          );
        });
        if (argumentList.length > 0) {
          output = output.concat([
            helper.styleTitle("Arguments:"),
            ...argumentList,
            ""
          ]);
        }
        const optionList = helper.visibleOptions(cmd).map((option) => {
          return callFormatItem(
            helper.styleOptionTerm(helper.optionTerm(option)),
            helper.styleOptionDescription(helper.optionDescription(option))
          );
        });
        if (optionList.length > 0) {
          output = output.concat([
            helper.styleTitle("Options:"),
            ...optionList,
            ""
          ]);
        }
        if (helper.showGlobalOptions) {
          const globalOptionList = helper.visibleGlobalOptions(cmd).map((option) => {
            return callFormatItem(
              helper.styleOptionTerm(helper.optionTerm(option)),
              helper.styleOptionDescription(helper.optionDescription(option))
            );
          });
          if (globalOptionList.length > 0) {
            output = output.concat([
              helper.styleTitle("Global Options:"),
              ...globalOptionList,
              ""
            ]);
          }
        }
        const commandList = helper.visibleCommands(cmd).map((cmd2) => {
          return callFormatItem(
            helper.styleSubcommandTerm(helper.subcommandTerm(cmd2)),
            helper.styleSubcommandDescription(helper.subcommandDescription(cmd2))
          );
        });
        if (commandList.length > 0) {
          output = output.concat([
            helper.styleTitle("Commands:"),
            ...commandList,
            ""
          ]);
        }
        return output.join("\n");
      }
      /**
       * Return display width of string, ignoring ANSI escape sequences. Used in padding and wrapping calculations.
       *
       * @param {string} str
       * @returns {number}
       */
      displayWidth(str) {
        return stripColor(str).length;
      }
      /**
       * Style the title for displaying in the help. Called with 'Usage:', 'Options:', etc.
       *
       * @param {string} str
       * @returns {string}
       */
      styleTitle(str) {
        return str;
      }
      styleUsage(str) {
        return str.split(" ").map((word) => {
          if (word === "[options]") return this.styleOptionText(word);
          if (word === "[command]") return this.styleSubcommandText(word);
          if (word[0] === "[" || word[0] === "<")
            return this.styleArgumentText(word);
          return this.styleCommandText(word);
        }).join(" ");
      }
      styleCommandDescription(str) {
        return this.styleDescriptionText(str);
      }
      styleOptionDescription(str) {
        return this.styleDescriptionText(str);
      }
      styleSubcommandDescription(str) {
        return this.styleDescriptionText(str);
      }
      styleArgumentDescription(str) {
        return this.styleDescriptionText(str);
      }
      styleDescriptionText(str) {
        return str;
      }
      styleOptionTerm(str) {
        return this.styleOptionText(str);
      }
      styleSubcommandTerm(str) {
        return str.split(" ").map((word) => {
          if (word === "[options]") return this.styleOptionText(word);
          if (word[0] === "[" || word[0] === "<")
            return this.styleArgumentText(word);
          return this.styleSubcommandText(word);
        }).join(" ");
      }
      styleArgumentTerm(str) {
        return this.styleArgumentText(str);
      }
      styleOptionText(str) {
        return str;
      }
      styleArgumentText(str) {
        return str;
      }
      styleSubcommandText(str) {
        return str;
      }
      styleCommandText(str) {
        return str;
      }
      /**
       * Calculate the pad width from the maximum term length.
       *
       * @param {Command} cmd
       * @param {Help} helper
       * @returns {number}
       */
      padWidth(cmd, helper) {
        return Math.max(
          helper.longestOptionTermLength(cmd, helper),
          helper.longestGlobalOptionTermLength(cmd, helper),
          helper.longestSubcommandTermLength(cmd, helper),
          helper.longestArgumentTermLength(cmd, helper)
        );
      }
      /**
       * Detect manually wrapped and indented strings by checking for line break followed by whitespace.
       *
       * @param {string} str
       * @returns {boolean}
       */
      preformatted(str) {
        return /\n[^\S\r\n]/.test(str);
      }
      /**
       * Format the "item", which consists of a term and description. Pad the term and wrap the description, indenting the following lines.
       *
       * So "TTT", 5, "DDD DDDD DD DDD" might be formatted for this.helpWidth=17 like so:
       *   TTT  DDD DDDD
       *        DD DDD
       *
       * @param {string} term
       * @param {number} termWidth
       * @param {string} description
       * @param {Help} helper
       * @returns {string}
       */
      formatItem(term, termWidth, description, helper) {
        const itemIndent = 2;
        const itemIndentStr = " ".repeat(itemIndent);
        if (!description) return itemIndentStr + term;
        const paddedTerm = term.padEnd(
          termWidth + term.length - helper.displayWidth(term)
        );
        const spacerWidth = 2;
        const helpWidth = this.helpWidth ?? 80;
        const remainingWidth = helpWidth - termWidth - spacerWidth - itemIndent;
        let formattedDescription;
        if (remainingWidth < this.minWidthToWrap || helper.preformatted(description)) {
          formattedDescription = description;
        } else {
          const wrappedDescription = helper.boxWrap(description, remainingWidth);
          formattedDescription = wrappedDescription.replace(
            /\n/g,
            "\n" + " ".repeat(termWidth + spacerWidth)
          );
        }
        return itemIndentStr + paddedTerm + " ".repeat(spacerWidth) + formattedDescription.replace(/\n/g, `
${itemIndentStr}`);
      }
      /**
       * Wrap a string at whitespace, preserving existing line breaks.
       * Wrapping is skipped if the width is less than `minWidthToWrap`.
       *
       * @param {string} str
       * @param {number} width
       * @returns {string}
       */
      boxWrap(str, width) {
        if (width < this.minWidthToWrap) return str;
        const rawLines = str.split(/\r\n|\n/);
        const chunkPattern = /[\s]*[^\s]+/g;
        const wrappedLines = [];
        rawLines.forEach((line) => {
          const chunks = line.match(chunkPattern);
          if (chunks === null) {
            wrappedLines.push("");
            return;
          }
          let sumChunks = [chunks.shift()];
          let sumWidth = this.displayWidth(sumChunks[0]);
          chunks.forEach((chunk) => {
            const visibleWidth = this.displayWidth(chunk);
            if (sumWidth + visibleWidth <= width) {
              sumChunks.push(chunk);
              sumWidth += visibleWidth;
              return;
            }
            wrappedLines.push(sumChunks.join(""));
            const nextChunk = chunk.trimStart();
            sumChunks = [nextChunk];
            sumWidth = this.displayWidth(nextChunk);
          });
          wrappedLines.push(sumChunks.join(""));
        });
        return wrappedLines.join("\n");
      }
    };
    function stripColor(str) {
      const sgrPattern = /\x1b\[\d*(;\d*)*m/g;
      return str.replace(sgrPattern, "");
    }
    exports.Help = Help2;
    exports.stripColor = stripColor;
  }
});

// ../../node_modules/.pnpm/commander@13.1.0/node_modules/commander/lib/option.js
var require_option = __commonJS({
  "../../node_modules/.pnpm/commander@13.1.0/node_modules/commander/lib/option.js"(exports) {
    "use strict";
    var { InvalidArgumentError: InvalidArgumentError2 } = require_error();
    var Option2 = class {
      /**
       * Initialize a new `Option` with the given `flags` and `description`.
       *
       * @param {string} flags
       * @param {string} [description]
       */
      constructor(flags, description) {
        this.flags = flags;
        this.description = description || "";
        this.required = flags.includes("<");
        this.optional = flags.includes("[");
        this.variadic = /\w\.\.\.[>\]]$/.test(flags);
        this.mandatory = false;
        const optionFlags = splitOptionFlags(flags);
        this.short = optionFlags.shortFlag;
        this.long = optionFlags.longFlag;
        this.negate = false;
        if (this.long) {
          this.negate = this.long.startsWith("--no-");
        }
        this.defaultValue = void 0;
        this.defaultValueDescription = void 0;
        this.presetArg = void 0;
        this.envVar = void 0;
        this.parseArg = void 0;
        this.hidden = false;
        this.argChoices = void 0;
        this.conflictsWith = [];
        this.implied = void 0;
      }
      /**
       * Set the default value, and optionally supply the description to be displayed in the help.
       *
       * @param {*} value
       * @param {string} [description]
       * @return {Option}
       */
      default(value, description) {
        this.defaultValue = value;
        this.defaultValueDescription = description;
        return this;
      }
      /**
       * Preset to use when option used without option-argument, especially optional but also boolean and negated.
       * The custom processing (parseArg) is called.
       *
       * @example
       * new Option('--color').default('GREYSCALE').preset('RGB');
       * new Option('--donate [amount]').preset('20').argParser(parseFloat);
       *
       * @param {*} arg
       * @return {Option}
       */
      preset(arg) {
        this.presetArg = arg;
        return this;
      }
      /**
       * Add option name(s) that conflict with this option.
       * An error will be displayed if conflicting options are found during parsing.
       *
       * @example
       * new Option('--rgb').conflicts('cmyk');
       * new Option('--js').conflicts(['ts', 'jsx']);
       *
       * @param {(string | string[])} names
       * @return {Option}
       */
      conflicts(names) {
        this.conflictsWith = this.conflictsWith.concat(names);
        return this;
      }
      /**
       * Specify implied option values for when this option is set and the implied options are not.
       *
       * The custom processing (parseArg) is not called on the implied values.
       *
       * @example
       * program
       *   .addOption(new Option('--log', 'write logging information to file'))
       *   .addOption(new Option('--trace', 'log extra details').implies({ log: 'trace.txt' }));
       *
       * @param {object} impliedOptionValues
       * @return {Option}
       */
      implies(impliedOptionValues) {
        let newImplied = impliedOptionValues;
        if (typeof impliedOptionValues === "string") {
          newImplied = { [impliedOptionValues]: true };
        }
        this.implied = Object.assign(this.implied || {}, newImplied);
        return this;
      }
      /**
       * Set environment variable to check for option value.
       *
       * An environment variable is only used if when processed the current option value is
       * undefined, or the source of the current value is 'default' or 'config' or 'env'.
       *
       * @param {string} name
       * @return {Option}
       */
      env(name) {
        this.envVar = name;
        return this;
      }
      /**
       * Set the custom handler for processing CLI option arguments into option values.
       *
       * @param {Function} [fn]
       * @return {Option}
       */
      argParser(fn) {
        this.parseArg = fn;
        return this;
      }
      /**
       * Whether the option is mandatory and must have a value after parsing.
       *
       * @param {boolean} [mandatory=true]
       * @return {Option}
       */
      makeOptionMandatory(mandatory = true) {
        this.mandatory = !!mandatory;
        return this;
      }
      /**
       * Hide option in help.
       *
       * @param {boolean} [hide=true]
       * @return {Option}
       */
      hideHelp(hide = true) {
        this.hidden = !!hide;
        return this;
      }
      /**
       * @package
       */
      _concatValue(value, previous) {
        if (previous === this.defaultValue || !Array.isArray(previous)) {
          return [value];
        }
        return previous.concat(value);
      }
      /**
       * Only allow option value to be one of choices.
       *
       * @param {string[]} values
       * @return {Option}
       */
      choices(values) {
        this.argChoices = values.slice();
        this.parseArg = (arg, previous) => {
          if (!this.argChoices.includes(arg)) {
            throw new InvalidArgumentError2(
              `Allowed choices are ${this.argChoices.join(", ")}.`
            );
          }
          if (this.variadic) {
            return this._concatValue(arg, previous);
          }
          return arg;
        };
        return this;
      }
      /**
       * Return option name.
       *
       * @return {string}
       */
      name() {
        if (this.long) {
          return this.long.replace(/^--/, "");
        }
        return this.short.replace(/^-/, "");
      }
      /**
       * Return option name, in a camelcase format that can be used
       * as an object attribute key.
       *
       * @return {string}
       */
      attributeName() {
        if (this.negate) {
          return camelcase(this.name().replace(/^no-/, ""));
        }
        return camelcase(this.name());
      }
      /**
       * Check if `arg` matches the short or long flag.
       *
       * @param {string} arg
       * @return {boolean}
       * @package
       */
      is(arg) {
        return this.short === arg || this.long === arg;
      }
      /**
       * Return whether a boolean option.
       *
       * Options are one of boolean, negated, required argument, or optional argument.
       *
       * @return {boolean}
       * @package
       */
      isBoolean() {
        return !this.required && !this.optional && !this.negate;
      }
    };
    var DualOptions = class {
      /**
       * @param {Option[]} options
       */
      constructor(options) {
        this.positiveOptions = /* @__PURE__ */ new Map();
        this.negativeOptions = /* @__PURE__ */ new Map();
        this.dualOptions = /* @__PURE__ */ new Set();
        options.forEach((option) => {
          if (option.negate) {
            this.negativeOptions.set(option.attributeName(), option);
          } else {
            this.positiveOptions.set(option.attributeName(), option);
          }
        });
        this.negativeOptions.forEach((value, key) => {
          if (this.positiveOptions.has(key)) {
            this.dualOptions.add(key);
          }
        });
      }
      /**
       * Did the value come from the option, and not from possible matching dual option?
       *
       * @param {*} value
       * @param {Option} option
       * @returns {boolean}
       */
      valueFromOption(value, option) {
        const optionKey = option.attributeName();
        if (!this.dualOptions.has(optionKey)) return true;
        const preset = this.negativeOptions.get(optionKey).presetArg;
        const negativeValue = preset !== void 0 ? preset : false;
        return option.negate === (negativeValue === value);
      }
    };
    function camelcase(str) {
      return str.split("-").reduce((str2, word) => {
        return str2 + word[0].toUpperCase() + word.slice(1);
      });
    }
    function splitOptionFlags(flags) {
      let shortFlag;
      let longFlag;
      const shortFlagExp = /^-[^-]$/;
      const longFlagExp = /^--[^-]/;
      const flagParts = flags.split(/[ |,]+/).concat("guard");
      if (shortFlagExp.test(flagParts[0])) shortFlag = flagParts.shift();
      if (longFlagExp.test(flagParts[0])) longFlag = flagParts.shift();
      if (!shortFlag && shortFlagExp.test(flagParts[0]))
        shortFlag = flagParts.shift();
      if (!shortFlag && longFlagExp.test(flagParts[0])) {
        shortFlag = longFlag;
        longFlag = flagParts.shift();
      }
      if (flagParts[0].startsWith("-")) {
        const unsupportedFlag = flagParts[0];
        const baseError = `option creation failed due to '${unsupportedFlag}' in option flags '${flags}'`;
        if (/^-[^-][^-]/.test(unsupportedFlag))
          throw new Error(
            `${baseError}
- a short flag is a single dash and a single character
  - either use a single dash and a single character (for a short flag)
  - or use a double dash for a long option (and can have two, like '--ws, --workspace')`
          );
        if (shortFlagExp.test(unsupportedFlag))
          throw new Error(`${baseError}
- too many short flags`);
        if (longFlagExp.test(unsupportedFlag))
          throw new Error(`${baseError}
- too many long flags`);
        throw new Error(`${baseError}
- unrecognised flag format`);
      }
      if (shortFlag === void 0 && longFlag === void 0)
        throw new Error(
          `option creation failed due to no flags found in '${flags}'.`
        );
      return { shortFlag, longFlag };
    }
    exports.Option = Option2;
    exports.DualOptions = DualOptions;
  }
});

// ../../node_modules/.pnpm/commander@13.1.0/node_modules/commander/lib/suggestSimilar.js
var require_suggestSimilar = __commonJS({
  "../../node_modules/.pnpm/commander@13.1.0/node_modules/commander/lib/suggestSimilar.js"(exports) {
    "use strict";
    var maxDistance = 3;
    function editDistance(a, b) {
      if (Math.abs(a.length - b.length) > maxDistance)
        return Math.max(a.length, b.length);
      const d = [];
      for (let i = 0; i <= a.length; i++) {
        d[i] = [i];
      }
      for (let j = 0; j <= b.length; j++) {
        d[0][j] = j;
      }
      for (let j = 1; j <= b.length; j++) {
        for (let i = 1; i <= a.length; i++) {
          let cost = 1;
          if (a[i - 1] === b[j - 1]) {
            cost = 0;
          } else {
            cost = 1;
          }
          d[i][j] = Math.min(
            d[i - 1][j] + 1,
            // deletion
            d[i][j - 1] + 1,
            // insertion
            d[i - 1][j - 1] + cost
            // substitution
          );
          if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
            d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
          }
        }
      }
      return d[a.length][b.length];
    }
    function suggestSimilar(word, candidates) {
      if (!candidates || candidates.length === 0) return "";
      candidates = Array.from(new Set(candidates));
      const searchingOptions = word.startsWith("--");
      if (searchingOptions) {
        word = word.slice(2);
        candidates = candidates.map((candidate) => candidate.slice(2));
      }
      let similar = [];
      let bestDistance = maxDistance;
      const minSimilarity = 0.4;
      candidates.forEach((candidate) => {
        if (candidate.length <= 1) return;
        const distance = editDistance(word, candidate);
        const length = Math.max(word.length, candidate.length);
        const similarity = (length - distance) / length;
        if (similarity > minSimilarity) {
          if (distance < bestDistance) {
            bestDistance = distance;
            similar = [candidate];
          } else if (distance === bestDistance) {
            similar.push(candidate);
          }
        }
      });
      similar.sort((a, b) => a.localeCompare(b));
      if (searchingOptions) {
        similar = similar.map((candidate) => `--${candidate}`);
      }
      if (similar.length > 1) {
        return `
(Did you mean one of ${similar.join(", ")}?)`;
      }
      if (similar.length === 1) {
        return `
(Did you mean ${similar[0]}?)`;
      }
      return "";
    }
    exports.suggestSimilar = suggestSimilar;
  }
});

// ../../node_modules/.pnpm/commander@13.1.0/node_modules/commander/lib/command.js
var require_command = __commonJS({
  "../../node_modules/.pnpm/commander@13.1.0/node_modules/commander/lib/command.js"(exports) {
    "use strict";
    var EventEmitter = __require("node:events").EventEmitter;
    var childProcess = __require("node:child_process");
    var path = __require("node:path");
    var fs = __require("node:fs");
    var process2 = __require("node:process");
    var { Argument: Argument2, humanReadableArgName } = require_argument();
    var { CommanderError: CommanderError2 } = require_error();
    var { Help: Help2, stripColor } = require_help();
    var { Option: Option2, DualOptions } = require_option();
    var { suggestSimilar } = require_suggestSimilar();
    var Command2 = class _Command extends EventEmitter {
      /**
       * Initialize a new `Command`.
       *
       * @param {string} [name]
       */
      constructor(name) {
        super();
        this.commands = [];
        this.options = [];
        this.parent = null;
        this._allowUnknownOption = false;
        this._allowExcessArguments = false;
        this.registeredArguments = [];
        this._args = this.registeredArguments;
        this.args = [];
        this.rawArgs = [];
        this.processedArgs = [];
        this._scriptPath = null;
        this._name = name || "";
        this._optionValues = {};
        this._optionValueSources = {};
        this._storeOptionsAsProperties = false;
        this._actionHandler = null;
        this._executableHandler = false;
        this._executableFile = null;
        this._executableDir = null;
        this._defaultCommandName = null;
        this._exitCallback = null;
        this._aliases = [];
        this._combineFlagAndOptionalValue = true;
        this._description = "";
        this._summary = "";
        this._argsDescription = void 0;
        this._enablePositionalOptions = false;
        this._passThroughOptions = false;
        this._lifeCycleHooks = {};
        this._showHelpAfterError = false;
        this._showSuggestionAfterError = true;
        this._savedState = null;
        this._outputConfiguration = {
          writeOut: (str) => process2.stdout.write(str),
          writeErr: (str) => process2.stderr.write(str),
          outputError: (str, write) => write(str),
          getOutHelpWidth: () => process2.stdout.isTTY ? process2.stdout.columns : void 0,
          getErrHelpWidth: () => process2.stderr.isTTY ? process2.stderr.columns : void 0,
          getOutHasColors: () => useColor() ?? (process2.stdout.isTTY && process2.stdout.hasColors?.()),
          getErrHasColors: () => useColor() ?? (process2.stderr.isTTY && process2.stderr.hasColors?.()),
          stripColor: (str) => stripColor(str)
        };
        this._hidden = false;
        this._helpOption = void 0;
        this._addImplicitHelpCommand = void 0;
        this._helpCommand = void 0;
        this._helpConfiguration = {};
      }
      /**
       * Copy settings that are useful to have in common across root command and subcommands.
       *
       * (Used internally when adding a command using `.command()` so subcommands inherit parent settings.)
       *
       * @param {Command} sourceCommand
       * @return {Command} `this` command for chaining
       */
      copyInheritedSettings(sourceCommand) {
        this._outputConfiguration = sourceCommand._outputConfiguration;
        this._helpOption = sourceCommand._helpOption;
        this._helpCommand = sourceCommand._helpCommand;
        this._helpConfiguration = sourceCommand._helpConfiguration;
        this._exitCallback = sourceCommand._exitCallback;
        this._storeOptionsAsProperties = sourceCommand._storeOptionsAsProperties;
        this._combineFlagAndOptionalValue = sourceCommand._combineFlagAndOptionalValue;
        this._allowExcessArguments = sourceCommand._allowExcessArguments;
        this._enablePositionalOptions = sourceCommand._enablePositionalOptions;
        this._showHelpAfterError = sourceCommand._showHelpAfterError;
        this._showSuggestionAfterError = sourceCommand._showSuggestionAfterError;
        return this;
      }
      /**
       * @returns {Command[]}
       * @private
       */
      _getCommandAndAncestors() {
        const result = [];
        for (let command = this; command; command = command.parent) {
          result.push(command);
        }
        return result;
      }
      /**
       * Define a command.
       *
       * There are two styles of command: pay attention to where to put the description.
       *
       * @example
       * // Command implemented using action handler (description is supplied separately to `.command`)
       * program
       *   .command('clone <source> [destination]')
       *   .description('clone a repository into a newly created directory')
       *   .action((source, destination) => {
       *     console.log('clone command called');
       *   });
       *
       * // Command implemented using separate executable file (description is second parameter to `.command`)
       * program
       *   .command('start <service>', 'start named service')
       *   .command('stop [service]', 'stop named service, or all if no name supplied');
       *
       * @param {string} nameAndArgs - command name and arguments, args are `<required>` or `[optional]` and last may also be `variadic...`
       * @param {(object | string)} [actionOptsOrExecDesc] - configuration options (for action), or description (for executable)
       * @param {object} [execOpts] - configuration options (for executable)
       * @return {Command} returns new command for action handler, or `this` for executable command
       */
      command(nameAndArgs, actionOptsOrExecDesc, execOpts) {
        let desc = actionOptsOrExecDesc;
        let opts = execOpts;
        if (typeof desc === "object" && desc !== null) {
          opts = desc;
          desc = null;
        }
        opts = opts || {};
        const [, name, args] = nameAndArgs.match(/([^ ]+) *(.*)/);
        const cmd = this.createCommand(name);
        if (desc) {
          cmd.description(desc);
          cmd._executableHandler = true;
        }
        if (opts.isDefault) this._defaultCommandName = cmd._name;
        cmd._hidden = !!(opts.noHelp || opts.hidden);
        cmd._executableFile = opts.executableFile || null;
        if (args) cmd.arguments(args);
        this._registerCommand(cmd);
        cmd.parent = this;
        cmd.copyInheritedSettings(this);
        if (desc) return this;
        return cmd;
      }
      /**
       * Factory routine to create a new unattached command.
       *
       * See .command() for creating an attached subcommand, which uses this routine to
       * create the command. You can override createCommand to customise subcommands.
       *
       * @param {string} [name]
       * @return {Command} new command
       */
      createCommand(name) {
        return new _Command(name);
      }
      /**
       * You can customise the help with a subclass of Help by overriding createHelp,
       * or by overriding Help properties using configureHelp().
       *
       * @return {Help}
       */
      createHelp() {
        return Object.assign(new Help2(), this.configureHelp());
      }
      /**
       * You can customise the help by overriding Help properties using configureHelp(),
       * or with a subclass of Help by overriding createHelp().
       *
       * @param {object} [configuration] - configuration options
       * @return {(Command | object)} `this` command for chaining, or stored configuration
       */
      configureHelp(configuration) {
        if (configuration === void 0) return this._helpConfiguration;
        this._helpConfiguration = configuration;
        return this;
      }
      /**
       * The default output goes to stdout and stderr. You can customise this for special
       * applications. You can also customise the display of errors by overriding outputError.
       *
       * The configuration properties are all functions:
       *
       *     // change how output being written, defaults to stdout and stderr
       *     writeOut(str)
       *     writeErr(str)
       *     // change how output being written for errors, defaults to writeErr
       *     outputError(str, write) // used for displaying errors and not used for displaying help
       *     // specify width for wrapping help
       *     getOutHelpWidth()
       *     getErrHelpWidth()
       *     // color support, currently only used with Help
       *     getOutHasColors()
       *     getErrHasColors()
       *     stripColor() // used to remove ANSI escape codes if output does not have colors
       *
       * @param {object} [configuration] - configuration options
       * @return {(Command | object)} `this` command for chaining, or stored configuration
       */
      configureOutput(configuration) {
        if (configuration === void 0) return this._outputConfiguration;
        Object.assign(this._outputConfiguration, configuration);
        return this;
      }
      /**
       * Display the help or a custom message after an error occurs.
       *
       * @param {(boolean|string)} [displayHelp]
       * @return {Command} `this` command for chaining
       */
      showHelpAfterError(displayHelp = true) {
        if (typeof displayHelp !== "string") displayHelp = !!displayHelp;
        this._showHelpAfterError = displayHelp;
        return this;
      }
      /**
       * Display suggestion of similar commands for unknown commands, or options for unknown options.
       *
       * @param {boolean} [displaySuggestion]
       * @return {Command} `this` command for chaining
       */
      showSuggestionAfterError(displaySuggestion = true) {
        this._showSuggestionAfterError = !!displaySuggestion;
        return this;
      }
      /**
       * Add a prepared subcommand.
       *
       * See .command() for creating an attached subcommand which inherits settings from its parent.
       *
       * @param {Command} cmd - new subcommand
       * @param {object} [opts] - configuration options
       * @return {Command} `this` command for chaining
       */
      addCommand(cmd, opts) {
        if (!cmd._name) {
          throw new Error(`Command passed to .addCommand() must have a name
- specify the name in Command constructor or using .name()`);
        }
        opts = opts || {};
        if (opts.isDefault) this._defaultCommandName = cmd._name;
        if (opts.noHelp || opts.hidden) cmd._hidden = true;
        this._registerCommand(cmd);
        cmd.parent = this;
        cmd._checkForBrokenPassThrough();
        return this;
      }
      /**
       * Factory routine to create a new unattached argument.
       *
       * See .argument() for creating an attached argument, which uses this routine to
       * create the argument. You can override createArgument to return a custom argument.
       *
       * @param {string} name
       * @param {string} [description]
       * @return {Argument} new argument
       */
      createArgument(name, description) {
        return new Argument2(name, description);
      }
      /**
       * Define argument syntax for command.
       *
       * The default is that the argument is required, and you can explicitly
       * indicate this with <> around the name. Put [] around the name for an optional argument.
       *
       * @example
       * program.argument('<input-file>');
       * program.argument('[output-file]');
       *
       * @param {string} name
       * @param {string} [description]
       * @param {(Function|*)} [fn] - custom argument processing function
       * @param {*} [defaultValue]
       * @return {Command} `this` command for chaining
       */
      argument(name, description, fn, defaultValue) {
        const argument = this.createArgument(name, description);
        if (typeof fn === "function") {
          argument.default(defaultValue).argParser(fn);
        } else {
          argument.default(fn);
        }
        this.addArgument(argument);
        return this;
      }
      /**
       * Define argument syntax for command, adding multiple at once (without descriptions).
       *
       * See also .argument().
       *
       * @example
       * program.arguments('<cmd> [env]');
       *
       * @param {string} names
       * @return {Command} `this` command for chaining
       */
      arguments(names) {
        names.trim().split(/ +/).forEach((detail) => {
          this.argument(detail);
        });
        return this;
      }
      /**
       * Define argument syntax for command, adding a prepared argument.
       *
       * @param {Argument} argument
       * @return {Command} `this` command for chaining
       */
      addArgument(argument) {
        const previousArgument = this.registeredArguments.slice(-1)[0];
        if (previousArgument && previousArgument.variadic) {
          throw new Error(
            `only the last argument can be variadic '${previousArgument.name()}'`
          );
        }
        if (argument.required && argument.defaultValue !== void 0 && argument.parseArg === void 0) {
          throw new Error(
            `a default value for a required argument is never used: '${argument.name()}'`
          );
        }
        this.registeredArguments.push(argument);
        return this;
      }
      /**
       * Customise or override default help command. By default a help command is automatically added if your command has subcommands.
       *
       * @example
       *    program.helpCommand('help [cmd]');
       *    program.helpCommand('help [cmd]', 'show help');
       *    program.helpCommand(false); // suppress default help command
       *    program.helpCommand(true); // add help command even if no subcommands
       *
       * @param {string|boolean} enableOrNameAndArgs - enable with custom name and/or arguments, or boolean to override whether added
       * @param {string} [description] - custom description
       * @return {Command} `this` command for chaining
       */
      helpCommand(enableOrNameAndArgs, description) {
        if (typeof enableOrNameAndArgs === "boolean") {
          this._addImplicitHelpCommand = enableOrNameAndArgs;
          return this;
        }
        enableOrNameAndArgs = enableOrNameAndArgs ?? "help [command]";
        const [, helpName, helpArgs] = enableOrNameAndArgs.match(/([^ ]+) *(.*)/);
        const helpDescription = description ?? "display help for command";
        const helpCommand = this.createCommand(helpName);
        helpCommand.helpOption(false);
        if (helpArgs) helpCommand.arguments(helpArgs);
        if (helpDescription) helpCommand.description(helpDescription);
        this._addImplicitHelpCommand = true;
        this._helpCommand = helpCommand;
        return this;
      }
      /**
       * Add prepared custom help command.
       *
       * @param {(Command|string|boolean)} helpCommand - custom help command, or deprecated enableOrNameAndArgs as for `.helpCommand()`
       * @param {string} [deprecatedDescription] - deprecated custom description used with custom name only
       * @return {Command} `this` command for chaining
       */
      addHelpCommand(helpCommand, deprecatedDescription) {
        if (typeof helpCommand !== "object") {
          this.helpCommand(helpCommand, deprecatedDescription);
          return this;
        }
        this._addImplicitHelpCommand = true;
        this._helpCommand = helpCommand;
        return this;
      }
      /**
       * Lazy create help command.
       *
       * @return {(Command|null)}
       * @package
       */
      _getHelpCommand() {
        const hasImplicitHelpCommand = this._addImplicitHelpCommand ?? (this.commands.length && !this._actionHandler && !this._findCommand("help"));
        if (hasImplicitHelpCommand) {
          if (this._helpCommand === void 0) {
            this.helpCommand(void 0, void 0);
          }
          return this._helpCommand;
        }
        return null;
      }
      /**
       * Add hook for life cycle event.
       *
       * @param {string} event
       * @param {Function} listener
       * @return {Command} `this` command for chaining
       */
      hook(event, listener) {
        const allowedValues = ["preSubcommand", "preAction", "postAction"];
        if (!allowedValues.includes(event)) {
          throw new Error(`Unexpected value for event passed to hook : '${event}'.
Expecting one of '${allowedValues.join("', '")}'`);
        }
        if (this._lifeCycleHooks[event]) {
          this._lifeCycleHooks[event].push(listener);
        } else {
          this._lifeCycleHooks[event] = [listener];
        }
        return this;
      }
      /**
       * Register callback to use as replacement for calling process.exit.
       *
       * @param {Function} [fn] optional callback which will be passed a CommanderError, defaults to throwing
       * @return {Command} `this` command for chaining
       */
      exitOverride(fn) {
        if (fn) {
          this._exitCallback = fn;
        } else {
          this._exitCallback = (err) => {
            if (err.code !== "commander.executeSubCommandAsync") {
              throw err;
            } else {
            }
          };
        }
        return this;
      }
      /**
       * Call process.exit, and _exitCallback if defined.
       *
       * @param {number} exitCode exit code for using with process.exit
       * @param {string} code an id string representing the error
       * @param {string} message human-readable description of the error
       * @return never
       * @private
       */
      _exit(exitCode, code, message) {
        if (this._exitCallback) {
          this._exitCallback(new CommanderError2(exitCode, code, message));
        }
        process2.exit(exitCode);
      }
      /**
       * Register callback `fn` for the command.
       *
       * @example
       * program
       *   .command('serve')
       *   .description('start service')
       *   .action(function() {
       *      // do work here
       *   });
       *
       * @param {Function} fn
       * @return {Command} `this` command for chaining
       */
      action(fn) {
        const listener = (args) => {
          const expectedArgsCount = this.registeredArguments.length;
          const actionArgs = args.slice(0, expectedArgsCount);
          if (this._storeOptionsAsProperties) {
            actionArgs[expectedArgsCount] = this;
          } else {
            actionArgs[expectedArgsCount] = this.opts();
          }
          actionArgs.push(this);
          return fn.apply(this, actionArgs);
        };
        this._actionHandler = listener;
        return this;
      }
      /**
       * Factory routine to create a new unattached option.
       *
       * See .option() for creating an attached option, which uses this routine to
       * create the option. You can override createOption to return a custom option.
       *
       * @param {string} flags
       * @param {string} [description]
       * @return {Option} new option
       */
      createOption(flags, description) {
        return new Option2(flags, description);
      }
      /**
       * Wrap parseArgs to catch 'commander.invalidArgument'.
       *
       * @param {(Option | Argument)} target
       * @param {string} value
       * @param {*} previous
       * @param {string} invalidArgumentMessage
       * @private
       */
      _callParseArg(target, value, previous, invalidArgumentMessage) {
        try {
          return target.parseArg(value, previous);
        } catch (err) {
          if (err.code === "commander.invalidArgument") {
            const message = `${invalidArgumentMessage} ${err.message}`;
            this.error(message, { exitCode: err.exitCode, code: err.code });
          }
          throw err;
        }
      }
      /**
       * Check for option flag conflicts.
       * Register option if no conflicts found, or throw on conflict.
       *
       * @param {Option} option
       * @private
       */
      _registerOption(option) {
        const matchingOption = option.short && this._findOption(option.short) || option.long && this._findOption(option.long);
        if (matchingOption) {
          const matchingFlag = option.long && this._findOption(option.long) ? option.long : option.short;
          throw new Error(`Cannot add option '${option.flags}'${this._name && ` to command '${this._name}'`} due to conflicting flag '${matchingFlag}'
-  already used by option '${matchingOption.flags}'`);
        }
        this.options.push(option);
      }
      /**
       * Check for command name and alias conflicts with existing commands.
       * Register command if no conflicts found, or throw on conflict.
       *
       * @param {Command} command
       * @private
       */
      _registerCommand(command) {
        const knownBy = (cmd) => {
          return [cmd.name()].concat(cmd.aliases());
        };
        const alreadyUsed = knownBy(command).find(
          (name) => this._findCommand(name)
        );
        if (alreadyUsed) {
          const existingCmd = knownBy(this._findCommand(alreadyUsed)).join("|");
          const newCmd = knownBy(command).join("|");
          throw new Error(
            `cannot add command '${newCmd}' as already have command '${existingCmd}'`
          );
        }
        this.commands.push(command);
      }
      /**
       * Add an option.
       *
       * @param {Option} option
       * @return {Command} `this` command for chaining
       */
      addOption(option) {
        this._registerOption(option);
        const oname = option.name();
        const name = option.attributeName();
        if (option.negate) {
          const positiveLongFlag = option.long.replace(/^--no-/, "--");
          if (!this._findOption(positiveLongFlag)) {
            this.setOptionValueWithSource(
              name,
              option.defaultValue === void 0 ? true : option.defaultValue,
              "default"
            );
          }
        } else if (option.defaultValue !== void 0) {
          this.setOptionValueWithSource(name, option.defaultValue, "default");
        }
        const handleOptionValue = (val, invalidValueMessage, valueSource) => {
          if (val == null && option.presetArg !== void 0) {
            val = option.presetArg;
          }
          const oldValue = this.getOptionValue(name);
          if (val !== null && option.parseArg) {
            val = this._callParseArg(option, val, oldValue, invalidValueMessage);
          } else if (val !== null && option.variadic) {
            val = option._concatValue(val, oldValue);
          }
          if (val == null) {
            if (option.negate) {
              val = false;
            } else if (option.isBoolean() || option.optional) {
              val = true;
            } else {
              val = "";
            }
          }
          this.setOptionValueWithSource(name, val, valueSource);
        };
        this.on("option:" + oname, (val) => {
          const invalidValueMessage = `error: option '${option.flags}' argument '${val}' is invalid.`;
          handleOptionValue(val, invalidValueMessage, "cli");
        });
        if (option.envVar) {
          this.on("optionEnv:" + oname, (val) => {
            const invalidValueMessage = `error: option '${option.flags}' value '${val}' from env '${option.envVar}' is invalid.`;
            handleOptionValue(val, invalidValueMessage, "env");
          });
        }
        return this;
      }
      /**
       * Internal implementation shared by .option() and .requiredOption()
       *
       * @return {Command} `this` command for chaining
       * @private
       */
      _optionEx(config, flags, description, fn, defaultValue) {
        if (typeof flags === "object" && flags instanceof Option2) {
          throw new Error(
            "To add an Option object use addOption() instead of option() or requiredOption()"
          );
        }
        const option = this.createOption(flags, description);
        option.makeOptionMandatory(!!config.mandatory);
        if (typeof fn === "function") {
          option.default(defaultValue).argParser(fn);
        } else if (fn instanceof RegExp) {
          const regex = fn;
          fn = (val, def) => {
            const m = regex.exec(val);
            return m ? m[0] : def;
          };
          option.default(defaultValue).argParser(fn);
        } else {
          option.default(fn);
        }
        return this.addOption(option);
      }
      /**
       * Define option with `flags`, `description`, and optional argument parsing function or `defaultValue` or both.
       *
       * The `flags` string contains the short and/or long flags, separated by comma, a pipe or space. A required
       * option-argument is indicated by `<>` and an optional option-argument by `[]`.
       *
       * See the README for more details, and see also addOption() and requiredOption().
       *
       * @example
       * program
       *     .option('-p, --pepper', 'add pepper')
       *     .option('--pt, --pizza-type <TYPE>', 'type of pizza') // required option-argument
       *     .option('-c, --cheese [CHEESE]', 'add extra cheese', 'mozzarella') // optional option-argument with default
       *     .option('-t, --tip <VALUE>', 'add tip to purchase cost', parseFloat) // custom parse function
       *
       * @param {string} flags
       * @param {string} [description]
       * @param {(Function|*)} [parseArg] - custom option processing function or default value
       * @param {*} [defaultValue]
       * @return {Command} `this` command for chaining
       */
      option(flags, description, parseArg, defaultValue) {
        return this._optionEx({}, flags, description, parseArg, defaultValue);
      }
      /**
       * Add a required option which must have a value after parsing. This usually means
       * the option must be specified on the command line. (Otherwise the same as .option().)
       *
       * The `flags` string contains the short and/or long flags, separated by comma, a pipe or space.
       *
       * @param {string} flags
       * @param {string} [description]
       * @param {(Function|*)} [parseArg] - custom option processing function or default value
       * @param {*} [defaultValue]
       * @return {Command} `this` command for chaining
       */
      requiredOption(flags, description, parseArg, defaultValue) {
        return this._optionEx(
          { mandatory: true },
          flags,
          description,
          parseArg,
          defaultValue
        );
      }
      /**
       * Alter parsing of short flags with optional values.
       *
       * @example
       * // for `.option('-f,--flag [value]'):
       * program.combineFlagAndOptionalValue(true);  // `-f80` is treated like `--flag=80`, this is the default behaviour
       * program.combineFlagAndOptionalValue(false) // `-fb` is treated like `-f -b`
       *
       * @param {boolean} [combine] - if `true` or omitted, an optional value can be specified directly after the flag.
       * @return {Command} `this` command for chaining
       */
      combineFlagAndOptionalValue(combine = true) {
        this._combineFlagAndOptionalValue = !!combine;
        return this;
      }
      /**
       * Allow unknown options on the command line.
       *
       * @param {boolean} [allowUnknown] - if `true` or omitted, no error will be thrown for unknown options.
       * @return {Command} `this` command for chaining
       */
      allowUnknownOption(allowUnknown = true) {
        this._allowUnknownOption = !!allowUnknown;
        return this;
      }
      /**
       * Allow excess command-arguments on the command line. Pass false to make excess arguments an error.
       *
       * @param {boolean} [allowExcess] - if `true` or omitted, no error will be thrown for excess arguments.
       * @return {Command} `this` command for chaining
       */
      allowExcessArguments(allowExcess = true) {
        this._allowExcessArguments = !!allowExcess;
        return this;
      }
      /**
       * Enable positional options. Positional means global options are specified before subcommands which lets
       * subcommands reuse the same option names, and also enables subcommands to turn on passThroughOptions.
       * The default behaviour is non-positional and global options may appear anywhere on the command line.
       *
       * @param {boolean} [positional]
       * @return {Command} `this` command for chaining
       */
      enablePositionalOptions(positional = true) {
        this._enablePositionalOptions = !!positional;
        return this;
      }
      /**
       * Pass through options that come after command-arguments rather than treat them as command-options,
       * so actual command-options come before command-arguments. Turning this on for a subcommand requires
       * positional options to have been enabled on the program (parent commands).
       * The default behaviour is non-positional and options may appear before or after command-arguments.
       *
       * @param {boolean} [passThrough] for unknown options.
       * @return {Command} `this` command for chaining
       */
      passThroughOptions(passThrough = true) {
        this._passThroughOptions = !!passThrough;
        this._checkForBrokenPassThrough();
        return this;
      }
      /**
       * @private
       */
      _checkForBrokenPassThrough() {
        if (this.parent && this._passThroughOptions && !this.parent._enablePositionalOptions) {
          throw new Error(
            `passThroughOptions cannot be used for '${this._name}' without turning on enablePositionalOptions for parent command(s)`
          );
        }
      }
      /**
       * Whether to store option values as properties on command object,
       * or store separately (specify false). In both cases the option values can be accessed using .opts().
       *
       * @param {boolean} [storeAsProperties=true]
       * @return {Command} `this` command for chaining
       */
      storeOptionsAsProperties(storeAsProperties = true) {
        if (this.options.length) {
          throw new Error("call .storeOptionsAsProperties() before adding options");
        }
        if (Object.keys(this._optionValues).length) {
          throw new Error(
            "call .storeOptionsAsProperties() before setting option values"
          );
        }
        this._storeOptionsAsProperties = !!storeAsProperties;
        return this;
      }
      /**
       * Retrieve option value.
       *
       * @param {string} key
       * @return {object} value
       */
      getOptionValue(key) {
        if (this._storeOptionsAsProperties) {
          return this[key];
        }
        return this._optionValues[key];
      }
      /**
       * Store option value.
       *
       * @param {string} key
       * @param {object} value
       * @return {Command} `this` command for chaining
       */
      setOptionValue(key, value) {
        return this.setOptionValueWithSource(key, value, void 0);
      }
      /**
       * Store option value and where the value came from.
       *
       * @param {string} key
       * @param {object} value
       * @param {string} source - expected values are default/config/env/cli/implied
       * @return {Command} `this` command for chaining
       */
      setOptionValueWithSource(key, value, source) {
        if (this._storeOptionsAsProperties) {
          this[key] = value;
        } else {
          this._optionValues[key] = value;
        }
        this._optionValueSources[key] = source;
        return this;
      }
      /**
       * Get source of option value.
       * Expected values are default | config | env | cli | implied
       *
       * @param {string} key
       * @return {string}
       */
      getOptionValueSource(key) {
        return this._optionValueSources[key];
      }
      /**
       * Get source of option value. See also .optsWithGlobals().
       * Expected values are default | config | env | cli | implied
       *
       * @param {string} key
       * @return {string}
       */
      getOptionValueSourceWithGlobals(key) {
        let source;
        this._getCommandAndAncestors().forEach((cmd) => {
          if (cmd.getOptionValueSource(key) !== void 0) {
            source = cmd.getOptionValueSource(key);
          }
        });
        return source;
      }
      /**
       * Get user arguments from implied or explicit arguments.
       * Side-effects: set _scriptPath if args included script. Used for default program name, and subcommand searches.
       *
       * @private
       */
      _prepareUserArgs(argv, parseOptions) {
        if (argv !== void 0 && !Array.isArray(argv)) {
          throw new Error("first parameter to parse must be array or undefined");
        }
        parseOptions = parseOptions || {};
        if (argv === void 0 && parseOptions.from === void 0) {
          if (process2.versions?.electron) {
            parseOptions.from = "electron";
          }
          const execArgv = process2.execArgv ?? [];
          if (execArgv.includes("-e") || execArgv.includes("--eval") || execArgv.includes("-p") || execArgv.includes("--print")) {
            parseOptions.from = "eval";
          }
        }
        if (argv === void 0) {
          argv = process2.argv;
        }
        this.rawArgs = argv.slice();
        let userArgs;
        switch (parseOptions.from) {
          case void 0:
          case "node":
            this._scriptPath = argv[1];
            userArgs = argv.slice(2);
            break;
          case "electron":
            if (process2.defaultApp) {
              this._scriptPath = argv[1];
              userArgs = argv.slice(2);
            } else {
              userArgs = argv.slice(1);
            }
            break;
          case "user":
            userArgs = argv.slice(0);
            break;
          case "eval":
            userArgs = argv.slice(1);
            break;
          default:
            throw new Error(
              `unexpected parse option { from: '${parseOptions.from}' }`
            );
        }
        if (!this._name && this._scriptPath)
          this.nameFromFilename(this._scriptPath);
        this._name = this._name || "program";
        return userArgs;
      }
      /**
       * Parse `argv`, setting options and invoking commands when defined.
       *
       * Use parseAsync instead of parse if any of your action handlers are async.
       *
       * Call with no parameters to parse `process.argv`. Detects Electron and special node options like `node --eval`. Easy mode!
       *
       * Or call with an array of strings to parse, and optionally where the user arguments start by specifying where the arguments are `from`:
       * - `'node'`: default, `argv[0]` is the application and `argv[1]` is the script being run, with user arguments after that
       * - `'electron'`: `argv[0]` is the application and `argv[1]` varies depending on whether the electron application is packaged
       * - `'user'`: just user arguments
       *
       * @example
       * program.parse(); // parse process.argv and auto-detect electron and special node flags
       * program.parse(process.argv); // assume argv[0] is app and argv[1] is script
       * program.parse(my-args, { from: 'user' }); // just user supplied arguments, nothing special about argv[0]
       *
       * @param {string[]} [argv] - optional, defaults to process.argv
       * @param {object} [parseOptions] - optionally specify style of options with from: node/user/electron
       * @param {string} [parseOptions.from] - where the args are from: 'node', 'user', 'electron'
       * @return {Command} `this` command for chaining
       */
      parse(argv, parseOptions) {
        this._prepareForParse();
        const userArgs = this._prepareUserArgs(argv, parseOptions);
        this._parseCommand([], userArgs);
        return this;
      }
      /**
       * Parse `argv`, setting options and invoking commands when defined.
       *
       * Call with no parameters to parse `process.argv`. Detects Electron and special node options like `node --eval`. Easy mode!
       *
       * Or call with an array of strings to parse, and optionally where the user arguments start by specifying where the arguments are `from`:
       * - `'node'`: default, `argv[0]` is the application and `argv[1]` is the script being run, with user arguments after that
       * - `'electron'`: `argv[0]` is the application and `argv[1]` varies depending on whether the electron application is packaged
       * - `'user'`: just user arguments
       *
       * @example
       * await program.parseAsync(); // parse process.argv and auto-detect electron and special node flags
       * await program.parseAsync(process.argv); // assume argv[0] is app and argv[1] is script
       * await program.parseAsync(my-args, { from: 'user' }); // just user supplied arguments, nothing special about argv[0]
       *
       * @param {string[]} [argv]
       * @param {object} [parseOptions]
       * @param {string} parseOptions.from - where the args are from: 'node', 'user', 'electron'
       * @return {Promise}
       */
      async parseAsync(argv, parseOptions) {
        this._prepareForParse();
        const userArgs = this._prepareUserArgs(argv, parseOptions);
        await this._parseCommand([], userArgs);
        return this;
      }
      _prepareForParse() {
        if (this._savedState === null) {
          this.saveStateBeforeParse();
        } else {
          this.restoreStateBeforeParse();
        }
      }
      /**
       * Called the first time parse is called to save state and allow a restore before subsequent calls to parse.
       * Not usually called directly, but available for subclasses to save their custom state.
       *
       * This is called in a lazy way. Only commands used in parsing chain will have state saved.
       */
      saveStateBeforeParse() {
        this._savedState = {
          // name is stable if supplied by author, but may be unspecified for root command and deduced during parsing
          _name: this._name,
          // option values before parse have default values (including false for negated options)
          // shallow clones
          _optionValues: { ...this._optionValues },
          _optionValueSources: { ...this._optionValueSources }
        };
      }
      /**
       * Restore state before parse for calls after the first.
       * Not usually called directly, but available for subclasses to save their custom state.
       *
       * This is called in a lazy way. Only commands used in parsing chain will have state restored.
       */
      restoreStateBeforeParse() {
        if (this._storeOptionsAsProperties)
          throw new Error(`Can not call parse again when storeOptionsAsProperties is true.
- either make a new Command for each call to parse, or stop storing options as properties`);
        this._name = this._savedState._name;
        this._scriptPath = null;
        this.rawArgs = [];
        this._optionValues = { ...this._savedState._optionValues };
        this._optionValueSources = { ...this._savedState._optionValueSources };
        this.args = [];
        this.processedArgs = [];
      }
      /**
       * Throw if expected executable is missing. Add lots of help for author.
       *
       * @param {string} executableFile
       * @param {string} executableDir
       * @param {string} subcommandName
       */
      _checkForMissingExecutable(executableFile, executableDir, subcommandName) {
        if (fs.existsSync(executableFile)) return;
        const executableDirMessage = executableDir ? `searched for local subcommand relative to directory '${executableDir}'` : "no directory for search for local subcommand, use .executableDir() to supply a custom directory";
        const executableMissing = `'${executableFile}' does not exist
 - if '${subcommandName}' is not meant to be an executable command, remove description parameter from '.command()' and use '.description()' instead
 - if the default executable name is not suitable, use the executableFile option to supply a custom name or path
 - ${executableDirMessage}`;
        throw new Error(executableMissing);
      }
      /**
       * Execute a sub-command executable.
       *
       * @private
       */
      _executeSubCommand(subcommand, args) {
        args = args.slice();
        let launchWithNode = false;
        const sourceExt = [".js", ".ts", ".tsx", ".mjs", ".cjs"];
        function findFile(baseDir, baseName) {
          const localBin = path.resolve(baseDir, baseName);
          if (fs.existsSync(localBin)) return localBin;
          if (sourceExt.includes(path.extname(baseName))) return void 0;
          const foundExt = sourceExt.find(
            (ext) => fs.existsSync(`${localBin}${ext}`)
          );
          if (foundExt) return `${localBin}${foundExt}`;
          return void 0;
        }
        this._checkForMissingMandatoryOptions();
        this._checkForConflictingOptions();
        let executableFile = subcommand._executableFile || `${this._name}-${subcommand._name}`;
        let executableDir = this._executableDir || "";
        if (this._scriptPath) {
          let resolvedScriptPath;
          try {
            resolvedScriptPath = fs.realpathSync(this._scriptPath);
          } catch {
            resolvedScriptPath = this._scriptPath;
          }
          executableDir = path.resolve(
            path.dirname(resolvedScriptPath),
            executableDir
          );
        }
        if (executableDir) {
          let localFile = findFile(executableDir, executableFile);
          if (!localFile && !subcommand._executableFile && this._scriptPath) {
            const legacyName = path.basename(
              this._scriptPath,
              path.extname(this._scriptPath)
            );
            if (legacyName !== this._name) {
              localFile = findFile(
                executableDir,
                `${legacyName}-${subcommand._name}`
              );
            }
          }
          executableFile = localFile || executableFile;
        }
        launchWithNode = sourceExt.includes(path.extname(executableFile));
        let proc;
        if (process2.platform !== "win32") {
          if (launchWithNode) {
            args.unshift(executableFile);
            args = incrementNodeInspectorPort(process2.execArgv).concat(args);
            proc = childProcess.spawn(process2.argv[0], args, { stdio: "inherit" });
          } else {
            proc = childProcess.spawn(executableFile, args, { stdio: "inherit" });
          }
        } else {
          this._checkForMissingExecutable(
            executableFile,
            executableDir,
            subcommand._name
          );
          args.unshift(executableFile);
          args = incrementNodeInspectorPort(process2.execArgv).concat(args);
          proc = childProcess.spawn(process2.execPath, args, { stdio: "inherit" });
        }
        if (!proc.killed) {
          const signals = ["SIGUSR1", "SIGUSR2", "SIGTERM", "SIGINT", "SIGHUP"];
          signals.forEach((signal) => {
            process2.on(signal, () => {
              if (proc.killed === false && proc.exitCode === null) {
                proc.kill(signal);
              }
            });
          });
        }
        const exitCallback = this._exitCallback;
        proc.on("close", (code) => {
          code = code ?? 1;
          if (!exitCallback) {
            process2.exit(code);
          } else {
            exitCallback(
              new CommanderError2(
                code,
                "commander.executeSubCommandAsync",
                "(close)"
              )
            );
          }
        });
        proc.on("error", (err) => {
          if (err.code === "ENOENT") {
            this._checkForMissingExecutable(
              executableFile,
              executableDir,
              subcommand._name
            );
          } else if (err.code === "EACCES") {
            throw new Error(`'${executableFile}' not executable`);
          }
          if (!exitCallback) {
            process2.exit(1);
          } else {
            const wrappedError = new CommanderError2(
              1,
              "commander.executeSubCommandAsync",
              "(error)"
            );
            wrappedError.nestedError = err;
            exitCallback(wrappedError);
          }
        });
        this.runningCommand = proc;
      }
      /**
       * @private
       */
      _dispatchSubcommand(commandName, operands, unknown) {
        const subCommand = this._findCommand(commandName);
        if (!subCommand) this.help({ error: true });
        subCommand._prepareForParse();
        let promiseChain;
        promiseChain = this._chainOrCallSubCommandHook(
          promiseChain,
          subCommand,
          "preSubcommand"
        );
        promiseChain = this._chainOrCall(promiseChain, () => {
          if (subCommand._executableHandler) {
            this._executeSubCommand(subCommand, operands.concat(unknown));
          } else {
            return subCommand._parseCommand(operands, unknown);
          }
        });
        return promiseChain;
      }
      /**
       * Invoke help directly if possible, or dispatch if necessary.
       * e.g. help foo
       *
       * @private
       */
      _dispatchHelpCommand(subcommandName) {
        if (!subcommandName) {
          this.help();
        }
        const subCommand = this._findCommand(subcommandName);
        if (subCommand && !subCommand._executableHandler) {
          subCommand.help();
        }
        return this._dispatchSubcommand(
          subcommandName,
          [],
          [this._getHelpOption()?.long ?? this._getHelpOption()?.short ?? "--help"]
        );
      }
      /**
       * Check this.args against expected this.registeredArguments.
       *
       * @private
       */
      _checkNumberOfArguments() {
        this.registeredArguments.forEach((arg, i) => {
          if (arg.required && this.args[i] == null) {
            this.missingArgument(arg.name());
          }
        });
        if (this.registeredArguments.length > 0 && this.registeredArguments[this.registeredArguments.length - 1].variadic) {
          return;
        }
        if (this.args.length > this.registeredArguments.length) {
          this._excessArguments(this.args);
        }
      }
      /**
       * Process this.args using this.registeredArguments and save as this.processedArgs!
       *
       * @private
       */
      _processArguments() {
        const myParseArg = (argument, value, previous) => {
          let parsedValue = value;
          if (value !== null && argument.parseArg) {
            const invalidValueMessage = `error: command-argument value '${value}' is invalid for argument '${argument.name()}'.`;
            parsedValue = this._callParseArg(
              argument,
              value,
              previous,
              invalidValueMessage
            );
          }
          return parsedValue;
        };
        this._checkNumberOfArguments();
        const processedArgs = [];
        this.registeredArguments.forEach((declaredArg, index) => {
          let value = declaredArg.defaultValue;
          if (declaredArg.variadic) {
            if (index < this.args.length) {
              value = this.args.slice(index);
              if (declaredArg.parseArg) {
                value = value.reduce((processed, v) => {
                  return myParseArg(declaredArg, v, processed);
                }, declaredArg.defaultValue);
              }
            } else if (value === void 0) {
              value = [];
            }
          } else if (index < this.args.length) {
            value = this.args[index];
            if (declaredArg.parseArg) {
              value = myParseArg(declaredArg, value, declaredArg.defaultValue);
            }
          }
          processedArgs[index] = value;
        });
        this.processedArgs = processedArgs;
      }
      /**
       * Once we have a promise we chain, but call synchronously until then.
       *
       * @param {(Promise|undefined)} promise
       * @param {Function} fn
       * @return {(Promise|undefined)}
       * @private
       */
      _chainOrCall(promise, fn) {
        if (promise && promise.then && typeof promise.then === "function") {
          return promise.then(() => fn());
        }
        return fn();
      }
      /**
       *
       * @param {(Promise|undefined)} promise
       * @param {string} event
       * @return {(Promise|undefined)}
       * @private
       */
      _chainOrCallHooks(promise, event) {
        let result = promise;
        const hooks = [];
        this._getCommandAndAncestors().reverse().filter((cmd) => cmd._lifeCycleHooks[event] !== void 0).forEach((hookedCommand) => {
          hookedCommand._lifeCycleHooks[event].forEach((callback) => {
            hooks.push({ hookedCommand, callback });
          });
        });
        if (event === "postAction") {
          hooks.reverse();
        }
        hooks.forEach((hookDetail) => {
          result = this._chainOrCall(result, () => {
            return hookDetail.callback(hookDetail.hookedCommand, this);
          });
        });
        return result;
      }
      /**
       *
       * @param {(Promise|undefined)} promise
       * @param {Command} subCommand
       * @param {string} event
       * @return {(Promise|undefined)}
       * @private
       */
      _chainOrCallSubCommandHook(promise, subCommand, event) {
        let result = promise;
        if (this._lifeCycleHooks[event] !== void 0) {
          this._lifeCycleHooks[event].forEach((hook) => {
            result = this._chainOrCall(result, () => {
              return hook(this, subCommand);
            });
          });
        }
        return result;
      }
      /**
       * Process arguments in context of this command.
       * Returns action result, in case it is a promise.
       *
       * @private
       */
      _parseCommand(operands, unknown) {
        const parsed = this.parseOptions(unknown);
        this._parseOptionsEnv();
        this._parseOptionsImplied();
        operands = operands.concat(parsed.operands);
        unknown = parsed.unknown;
        this.args = operands.concat(unknown);
        if (operands && this._findCommand(operands[0])) {
          return this._dispatchSubcommand(operands[0], operands.slice(1), unknown);
        }
        if (this._getHelpCommand() && operands[0] === this._getHelpCommand().name()) {
          return this._dispatchHelpCommand(operands[1]);
        }
        if (this._defaultCommandName) {
          this._outputHelpIfRequested(unknown);
          return this._dispatchSubcommand(
            this._defaultCommandName,
            operands,
            unknown
          );
        }
        if (this.commands.length && this.args.length === 0 && !this._actionHandler && !this._defaultCommandName) {
          this.help({ error: true });
        }
        this._outputHelpIfRequested(parsed.unknown);
        this._checkForMissingMandatoryOptions();
        this._checkForConflictingOptions();
        const checkForUnknownOptions = () => {
          if (parsed.unknown.length > 0) {
            this.unknownOption(parsed.unknown[0]);
          }
        };
        const commandEvent = `command:${this.name()}`;
        if (this._actionHandler) {
          checkForUnknownOptions();
          this._processArguments();
          let promiseChain;
          promiseChain = this._chainOrCallHooks(promiseChain, "preAction");
          promiseChain = this._chainOrCall(
            promiseChain,
            () => this._actionHandler(this.processedArgs)
          );
          if (this.parent) {
            promiseChain = this._chainOrCall(promiseChain, () => {
              this.parent.emit(commandEvent, operands, unknown);
            });
          }
          promiseChain = this._chainOrCallHooks(promiseChain, "postAction");
          return promiseChain;
        }
        if (this.parent && this.parent.listenerCount(commandEvent)) {
          checkForUnknownOptions();
          this._processArguments();
          this.parent.emit(commandEvent, operands, unknown);
        } else if (operands.length) {
          if (this._findCommand("*")) {
            return this._dispatchSubcommand("*", operands, unknown);
          }
          if (this.listenerCount("command:*")) {
            this.emit("command:*", operands, unknown);
          } else if (this.commands.length) {
            this.unknownCommand();
          } else {
            checkForUnknownOptions();
            this._processArguments();
          }
        } else if (this.commands.length) {
          checkForUnknownOptions();
          this.help({ error: true });
        } else {
          checkForUnknownOptions();
          this._processArguments();
        }
      }
      /**
       * Find matching command.
       *
       * @private
       * @return {Command | undefined}
       */
      _findCommand(name) {
        if (!name) return void 0;
        return this.commands.find(
          (cmd) => cmd._name === name || cmd._aliases.includes(name)
        );
      }
      /**
       * Return an option matching `arg` if any.
       *
       * @param {string} arg
       * @return {Option}
       * @package
       */
      _findOption(arg) {
        return this.options.find((option) => option.is(arg));
      }
      /**
       * Display an error message if a mandatory option does not have a value.
       * Called after checking for help flags in leaf subcommand.
       *
       * @private
       */
      _checkForMissingMandatoryOptions() {
        this._getCommandAndAncestors().forEach((cmd) => {
          cmd.options.forEach((anOption) => {
            if (anOption.mandatory && cmd.getOptionValue(anOption.attributeName()) === void 0) {
              cmd.missingMandatoryOptionValue(anOption);
            }
          });
        });
      }
      /**
       * Display an error message if conflicting options are used together in this.
       *
       * @private
       */
      _checkForConflictingLocalOptions() {
        const definedNonDefaultOptions = this.options.filter((option) => {
          const optionKey = option.attributeName();
          if (this.getOptionValue(optionKey) === void 0) {
            return false;
          }
          return this.getOptionValueSource(optionKey) !== "default";
        });
        const optionsWithConflicting = definedNonDefaultOptions.filter(
          (option) => option.conflictsWith.length > 0
        );
        optionsWithConflicting.forEach((option) => {
          const conflictingAndDefined = definedNonDefaultOptions.find(
            (defined) => option.conflictsWith.includes(defined.attributeName())
          );
          if (conflictingAndDefined) {
            this._conflictingOption(option, conflictingAndDefined);
          }
        });
      }
      /**
       * Display an error message if conflicting options are used together.
       * Called after checking for help flags in leaf subcommand.
       *
       * @private
       */
      _checkForConflictingOptions() {
        this._getCommandAndAncestors().forEach((cmd) => {
          cmd._checkForConflictingLocalOptions();
        });
      }
      /**
       * Parse options from `argv` removing known options,
       * and return argv split into operands and unknown arguments.
       *
       * Side effects: modifies command by storing options. Does not reset state if called again.
       *
       * Examples:
       *
       *     argv => operands, unknown
       *     --known kkk op => [op], []
       *     op --known kkk => [op], []
       *     sub --unknown uuu op => [sub], [--unknown uuu op]
       *     sub -- --unknown uuu op => [sub --unknown uuu op], []
       *
       * @param {string[]} argv
       * @return {{operands: string[], unknown: string[]}}
       */
      parseOptions(argv) {
        const operands = [];
        const unknown = [];
        let dest = operands;
        const args = argv.slice();
        function maybeOption(arg) {
          return arg.length > 1 && arg[0] === "-";
        }
        let activeVariadicOption = null;
        while (args.length) {
          const arg = args.shift();
          if (arg === "--") {
            if (dest === unknown) dest.push(arg);
            dest.push(...args);
            break;
          }
          if (activeVariadicOption && !maybeOption(arg)) {
            this.emit(`option:${activeVariadicOption.name()}`, arg);
            continue;
          }
          activeVariadicOption = null;
          if (maybeOption(arg)) {
            const option = this._findOption(arg);
            if (option) {
              if (option.required) {
                const value = args.shift();
                if (value === void 0) this.optionMissingArgument(option);
                this.emit(`option:${option.name()}`, value);
              } else if (option.optional) {
                let value = null;
                if (args.length > 0 && !maybeOption(args[0])) {
                  value = args.shift();
                }
                this.emit(`option:${option.name()}`, value);
              } else {
                this.emit(`option:${option.name()}`);
              }
              activeVariadicOption = option.variadic ? option : null;
              continue;
            }
          }
          if (arg.length > 2 && arg[0] === "-" && arg[1] !== "-") {
            const option = this._findOption(`-${arg[1]}`);
            if (option) {
              if (option.required || option.optional && this._combineFlagAndOptionalValue) {
                this.emit(`option:${option.name()}`, arg.slice(2));
              } else {
                this.emit(`option:${option.name()}`);
                args.unshift(`-${arg.slice(2)}`);
              }
              continue;
            }
          }
          if (/^--[^=]+=/.test(arg)) {
            const index = arg.indexOf("=");
            const option = this._findOption(arg.slice(0, index));
            if (option && (option.required || option.optional)) {
              this.emit(`option:${option.name()}`, arg.slice(index + 1));
              continue;
            }
          }
          if (maybeOption(arg)) {
            dest = unknown;
          }
          if ((this._enablePositionalOptions || this._passThroughOptions) && operands.length === 0 && unknown.length === 0) {
            if (this._findCommand(arg)) {
              operands.push(arg);
              if (args.length > 0) unknown.push(...args);
              break;
            } else if (this._getHelpCommand() && arg === this._getHelpCommand().name()) {
              operands.push(arg);
              if (args.length > 0) operands.push(...args);
              break;
            } else if (this._defaultCommandName) {
              unknown.push(arg);
              if (args.length > 0) unknown.push(...args);
              break;
            }
          }
          if (this._passThroughOptions) {
            dest.push(arg);
            if (args.length > 0) dest.push(...args);
            break;
          }
          dest.push(arg);
        }
        return { operands, unknown };
      }
      /**
       * Return an object containing local option values as key-value pairs.
       *
       * @return {object}
       */
      opts() {
        if (this._storeOptionsAsProperties) {
          const result = {};
          const len = this.options.length;
          for (let i = 0; i < len; i++) {
            const key = this.options[i].attributeName();
            result[key] = key === this._versionOptionName ? this._version : this[key];
          }
          return result;
        }
        return this._optionValues;
      }
      /**
       * Return an object containing merged local and global option values as key-value pairs.
       *
       * @return {object}
       */
      optsWithGlobals() {
        return this._getCommandAndAncestors().reduce(
          (combinedOptions, cmd) => Object.assign(combinedOptions, cmd.opts()),
          {}
        );
      }
      /**
       * Display error message and exit (or call exitOverride).
       *
       * @param {string} message
       * @param {object} [errorOptions]
       * @param {string} [errorOptions.code] - an id string representing the error
       * @param {number} [errorOptions.exitCode] - used with process.exit
       */
      error(message, errorOptions) {
        this._outputConfiguration.outputError(
          `${message}
`,
          this._outputConfiguration.writeErr
        );
        if (typeof this._showHelpAfterError === "string") {
          this._outputConfiguration.writeErr(`${this._showHelpAfterError}
`);
        } else if (this._showHelpAfterError) {
          this._outputConfiguration.writeErr("\n");
          this.outputHelp({ error: true });
        }
        const config = errorOptions || {};
        const exitCode = config.exitCode || 1;
        const code = config.code || "commander.error";
        this._exit(exitCode, code, message);
      }
      /**
       * Apply any option related environment variables, if option does
       * not have a value from cli or client code.
       *
       * @private
       */
      _parseOptionsEnv() {
        this.options.forEach((option) => {
          if (option.envVar && option.envVar in process2.env) {
            const optionKey = option.attributeName();
            if (this.getOptionValue(optionKey) === void 0 || ["default", "config", "env"].includes(
              this.getOptionValueSource(optionKey)
            )) {
              if (option.required || option.optional) {
                this.emit(`optionEnv:${option.name()}`, process2.env[option.envVar]);
              } else {
                this.emit(`optionEnv:${option.name()}`);
              }
            }
          }
        });
      }
      /**
       * Apply any implied option values, if option is undefined or default value.
       *
       * @private
       */
      _parseOptionsImplied() {
        const dualHelper = new DualOptions(this.options);
        const hasCustomOptionValue = (optionKey) => {
          return this.getOptionValue(optionKey) !== void 0 && !["default", "implied"].includes(this.getOptionValueSource(optionKey));
        };
        this.options.filter(
          (option) => option.implied !== void 0 && hasCustomOptionValue(option.attributeName()) && dualHelper.valueFromOption(
            this.getOptionValue(option.attributeName()),
            option
          )
        ).forEach((option) => {
          Object.keys(option.implied).filter((impliedKey) => !hasCustomOptionValue(impliedKey)).forEach((impliedKey) => {
            this.setOptionValueWithSource(
              impliedKey,
              option.implied[impliedKey],
              "implied"
            );
          });
        });
      }
      /**
       * Argument `name` is missing.
       *
       * @param {string} name
       * @private
       */
      missingArgument(name) {
        const message = `error: missing required argument '${name}'`;
        this.error(message, { code: "commander.missingArgument" });
      }
      /**
       * `Option` is missing an argument.
       *
       * @param {Option} option
       * @private
       */
      optionMissingArgument(option) {
        const message = `error: option '${option.flags}' argument missing`;
        this.error(message, { code: "commander.optionMissingArgument" });
      }
      /**
       * `Option` does not have a value, and is a mandatory option.
       *
       * @param {Option} option
       * @private
       */
      missingMandatoryOptionValue(option) {
        const message = `error: required option '${option.flags}' not specified`;
        this.error(message, { code: "commander.missingMandatoryOptionValue" });
      }
      /**
       * `Option` conflicts with another option.
       *
       * @param {Option} option
       * @param {Option} conflictingOption
       * @private
       */
      _conflictingOption(option, conflictingOption) {
        const findBestOptionFromValue = (option2) => {
          const optionKey = option2.attributeName();
          const optionValue = this.getOptionValue(optionKey);
          const negativeOption = this.options.find(
            (target) => target.negate && optionKey === target.attributeName()
          );
          const positiveOption = this.options.find(
            (target) => !target.negate && optionKey === target.attributeName()
          );
          if (negativeOption && (negativeOption.presetArg === void 0 && optionValue === false || negativeOption.presetArg !== void 0 && optionValue === negativeOption.presetArg)) {
            return negativeOption;
          }
          return positiveOption || option2;
        };
        const getErrorMessage = (option2) => {
          const bestOption = findBestOptionFromValue(option2);
          const optionKey = bestOption.attributeName();
          const source = this.getOptionValueSource(optionKey);
          if (source === "env") {
            return `environment variable '${bestOption.envVar}'`;
          }
          return `option '${bestOption.flags}'`;
        };
        const message = `error: ${getErrorMessage(option)} cannot be used with ${getErrorMessage(conflictingOption)}`;
        this.error(message, { code: "commander.conflictingOption" });
      }
      /**
       * Unknown option `flag`.
       *
       * @param {string} flag
       * @private
       */
      unknownOption(flag) {
        if (this._allowUnknownOption) return;
        let suggestion = "";
        if (flag.startsWith("--") && this._showSuggestionAfterError) {
          let candidateFlags = [];
          let command = this;
          do {
            const moreFlags = command.createHelp().visibleOptions(command).filter((option) => option.long).map((option) => option.long);
            candidateFlags = candidateFlags.concat(moreFlags);
            command = command.parent;
          } while (command && !command._enablePositionalOptions);
          suggestion = suggestSimilar(flag, candidateFlags);
        }
        const message = `error: unknown option '${flag}'${suggestion}`;
        this.error(message, { code: "commander.unknownOption" });
      }
      /**
       * Excess arguments, more than expected.
       *
       * @param {string[]} receivedArgs
       * @private
       */
      _excessArguments(receivedArgs) {
        if (this._allowExcessArguments) return;
        const expected = this.registeredArguments.length;
        const s = expected === 1 ? "" : "s";
        const forSubcommand = this.parent ? ` for '${this.name()}'` : "";
        const message = `error: too many arguments${forSubcommand}. Expected ${expected} argument${s} but got ${receivedArgs.length}.`;
        this.error(message, { code: "commander.excessArguments" });
      }
      /**
       * Unknown command.
       *
       * @private
       */
      unknownCommand() {
        const unknownName = this.args[0];
        let suggestion = "";
        if (this._showSuggestionAfterError) {
          const candidateNames = [];
          this.createHelp().visibleCommands(this).forEach((command) => {
            candidateNames.push(command.name());
            if (command.alias()) candidateNames.push(command.alias());
          });
          suggestion = suggestSimilar(unknownName, candidateNames);
        }
        const message = `error: unknown command '${unknownName}'${suggestion}`;
        this.error(message, { code: "commander.unknownCommand" });
      }
      /**
       * Get or set the program version.
       *
       * This method auto-registers the "-V, --version" option which will print the version number.
       *
       * You can optionally supply the flags and description to override the defaults.
       *
       * @param {string} [str]
       * @param {string} [flags]
       * @param {string} [description]
       * @return {(this | string | undefined)} `this` command for chaining, or version string if no arguments
       */
      version(str, flags, description) {
        if (str === void 0) return this._version;
        this._version = str;
        flags = flags || "-V, --version";
        description = description || "output the version number";
        const versionOption = this.createOption(flags, description);
        this._versionOptionName = versionOption.attributeName();
        this._registerOption(versionOption);
        this.on("option:" + versionOption.name(), () => {
          this._outputConfiguration.writeOut(`${str}
`);
          this._exit(0, "commander.version", str);
        });
        return this;
      }
      /**
       * Set the description.
       *
       * @param {string} [str]
       * @param {object} [argsDescription]
       * @return {(string|Command)}
       */
      description(str, argsDescription) {
        if (str === void 0 && argsDescription === void 0)
          return this._description;
        this._description = str;
        if (argsDescription) {
          this._argsDescription = argsDescription;
        }
        return this;
      }
      /**
       * Set the summary. Used when listed as subcommand of parent.
       *
       * @param {string} [str]
       * @return {(string|Command)}
       */
      summary(str) {
        if (str === void 0) return this._summary;
        this._summary = str;
        return this;
      }
      /**
       * Set an alias for the command.
       *
       * You may call more than once to add multiple aliases. Only the first alias is shown in the auto-generated help.
       *
       * @param {string} [alias]
       * @return {(string|Command)}
       */
      alias(alias) {
        if (alias === void 0) return this._aliases[0];
        let command = this;
        if (this.commands.length !== 0 && this.commands[this.commands.length - 1]._executableHandler) {
          command = this.commands[this.commands.length - 1];
        }
        if (alias === command._name)
          throw new Error("Command alias can't be the same as its name");
        const matchingCommand = this.parent?._findCommand(alias);
        if (matchingCommand) {
          const existingCmd = [matchingCommand.name()].concat(matchingCommand.aliases()).join("|");
          throw new Error(
            `cannot add alias '${alias}' to command '${this.name()}' as already have command '${existingCmd}'`
          );
        }
        command._aliases.push(alias);
        return this;
      }
      /**
       * Set aliases for the command.
       *
       * Only the first alias is shown in the auto-generated help.
       *
       * @param {string[]} [aliases]
       * @return {(string[]|Command)}
       */
      aliases(aliases) {
        if (aliases === void 0) return this._aliases;
        aliases.forEach((alias) => this.alias(alias));
        return this;
      }
      /**
       * Set / get the command usage `str`.
       *
       * @param {string} [str]
       * @return {(string|Command)}
       */
      usage(str) {
        if (str === void 0) {
          if (this._usage) return this._usage;
          const args = this.registeredArguments.map((arg) => {
            return humanReadableArgName(arg);
          });
          return [].concat(
            this.options.length || this._helpOption !== null ? "[options]" : [],
            this.commands.length ? "[command]" : [],
            this.registeredArguments.length ? args : []
          ).join(" ");
        }
        this._usage = str;
        return this;
      }
      /**
       * Get or set the name of the command.
       *
       * @param {string} [str]
       * @return {(string|Command)}
       */
      name(str) {
        if (str === void 0) return this._name;
        this._name = str;
        return this;
      }
      /**
       * Set the name of the command from script filename, such as process.argv[1],
       * or require.main.filename, or __filename.
       *
       * (Used internally and public although not documented in README.)
       *
       * @example
       * program.nameFromFilename(require.main.filename);
       *
       * @param {string} filename
       * @return {Command}
       */
      nameFromFilename(filename) {
        this._name = path.basename(filename, path.extname(filename));
        return this;
      }
      /**
       * Get or set the directory for searching for executable subcommands of this command.
       *
       * @example
       * program.executableDir(__dirname);
       * // or
       * program.executableDir('subcommands');
       *
       * @param {string} [path]
       * @return {(string|null|Command)}
       */
      executableDir(path2) {
        if (path2 === void 0) return this._executableDir;
        this._executableDir = path2;
        return this;
      }
      /**
       * Return program help documentation.
       *
       * @param {{ error: boolean }} [contextOptions] - pass {error:true} to wrap for stderr instead of stdout
       * @return {string}
       */
      helpInformation(contextOptions) {
        const helper = this.createHelp();
        const context = this._getOutputContext(contextOptions);
        helper.prepareContext({
          error: context.error,
          helpWidth: context.helpWidth,
          outputHasColors: context.hasColors
        });
        const text = helper.formatHelp(this, helper);
        if (context.hasColors) return text;
        return this._outputConfiguration.stripColor(text);
      }
      /**
       * @typedef HelpContext
       * @type {object}
       * @property {boolean} error
       * @property {number} helpWidth
       * @property {boolean} hasColors
       * @property {function} write - includes stripColor if needed
       *
       * @returns {HelpContext}
       * @private
       */
      _getOutputContext(contextOptions) {
        contextOptions = contextOptions || {};
        const error = !!contextOptions.error;
        let baseWrite;
        let hasColors;
        let helpWidth;
        if (error) {
          baseWrite = (str) => this._outputConfiguration.writeErr(str);
          hasColors = this._outputConfiguration.getErrHasColors();
          helpWidth = this._outputConfiguration.getErrHelpWidth();
        } else {
          baseWrite = (str) => this._outputConfiguration.writeOut(str);
          hasColors = this._outputConfiguration.getOutHasColors();
          helpWidth = this._outputConfiguration.getOutHelpWidth();
        }
        const write = (str) => {
          if (!hasColors) str = this._outputConfiguration.stripColor(str);
          return baseWrite(str);
        };
        return { error, write, hasColors, helpWidth };
      }
      /**
       * Output help information for this command.
       *
       * Outputs built-in help, and custom text added using `.addHelpText()`.
       *
       * @param {{ error: boolean } | Function} [contextOptions] - pass {error:true} to write to stderr instead of stdout
       */
      outputHelp(contextOptions) {
        let deprecatedCallback;
        if (typeof contextOptions === "function") {
          deprecatedCallback = contextOptions;
          contextOptions = void 0;
        }
        const outputContext = this._getOutputContext(contextOptions);
        const eventContext = {
          error: outputContext.error,
          write: outputContext.write,
          command: this
        };
        this._getCommandAndAncestors().reverse().forEach((command) => command.emit("beforeAllHelp", eventContext));
        this.emit("beforeHelp", eventContext);
        let helpInformation = this.helpInformation({ error: outputContext.error });
        if (deprecatedCallback) {
          helpInformation = deprecatedCallback(helpInformation);
          if (typeof helpInformation !== "string" && !Buffer.isBuffer(helpInformation)) {
            throw new Error("outputHelp callback must return a string or a Buffer");
          }
        }
        outputContext.write(helpInformation);
        if (this._getHelpOption()?.long) {
          this.emit(this._getHelpOption().long);
        }
        this.emit("afterHelp", eventContext);
        this._getCommandAndAncestors().forEach(
          (command) => command.emit("afterAllHelp", eventContext)
        );
      }
      /**
       * You can pass in flags and a description to customise the built-in help option.
       * Pass in false to disable the built-in help option.
       *
       * @example
       * program.helpOption('-?, --help' 'show help'); // customise
       * program.helpOption(false); // disable
       *
       * @param {(string | boolean)} flags
       * @param {string} [description]
       * @return {Command} `this` command for chaining
       */
      helpOption(flags, description) {
        if (typeof flags === "boolean") {
          if (flags) {
            this._helpOption = this._helpOption ?? void 0;
          } else {
            this._helpOption = null;
          }
          return this;
        }
        flags = flags ?? "-h, --help";
        description = description ?? "display help for command";
        this._helpOption = this.createOption(flags, description);
        return this;
      }
      /**
       * Lazy create help option.
       * Returns null if has been disabled with .helpOption(false).
       *
       * @returns {(Option | null)} the help option
       * @package
       */
      _getHelpOption() {
        if (this._helpOption === void 0) {
          this.helpOption(void 0, void 0);
        }
        return this._helpOption;
      }
      /**
       * Supply your own option to use for the built-in help option.
       * This is an alternative to using helpOption() to customise the flags and description etc.
       *
       * @param {Option} option
       * @return {Command} `this` command for chaining
       */
      addHelpOption(option) {
        this._helpOption = option;
        return this;
      }
      /**
       * Output help information and exit.
       *
       * Outputs built-in help, and custom text added using `.addHelpText()`.
       *
       * @param {{ error: boolean }} [contextOptions] - pass {error:true} to write to stderr instead of stdout
       */
      help(contextOptions) {
        this.outputHelp(contextOptions);
        let exitCode = Number(process2.exitCode ?? 0);
        if (exitCode === 0 && contextOptions && typeof contextOptions !== "function" && contextOptions.error) {
          exitCode = 1;
        }
        this._exit(exitCode, "commander.help", "(outputHelp)");
      }
      /**
       * // Do a little typing to coordinate emit and listener for the help text events.
       * @typedef HelpTextEventContext
       * @type {object}
       * @property {boolean} error
       * @property {Command} command
       * @property {function} write
       */
      /**
       * Add additional text to be displayed with the built-in help.
       *
       * Position is 'before' or 'after' to affect just this command,
       * and 'beforeAll' or 'afterAll' to affect this command and all its subcommands.
       *
       * @param {string} position - before or after built-in help
       * @param {(string | Function)} text - string to add, or a function returning a string
       * @return {Command} `this` command for chaining
       */
      addHelpText(position, text) {
        const allowedValues = ["beforeAll", "before", "after", "afterAll"];
        if (!allowedValues.includes(position)) {
          throw new Error(`Unexpected value for position to addHelpText.
Expecting one of '${allowedValues.join("', '")}'`);
        }
        const helpEvent = `${position}Help`;
        this.on(helpEvent, (context) => {
          let helpStr;
          if (typeof text === "function") {
            helpStr = text({ error: context.error, command: context.command });
          } else {
            helpStr = text;
          }
          if (helpStr) {
            context.write(`${helpStr}
`);
          }
        });
        return this;
      }
      /**
       * Output help information if help flags specified
       *
       * @param {Array} args - array of options to search for help flags
       * @private
       */
      _outputHelpIfRequested(args) {
        const helpOption = this._getHelpOption();
        const helpRequested = helpOption && args.find((arg) => helpOption.is(arg));
        if (helpRequested) {
          this.outputHelp();
          this._exit(0, "commander.helpDisplayed", "(outputHelp)");
        }
      }
    };
    function incrementNodeInspectorPort(args) {
      return args.map((arg) => {
        if (!arg.startsWith("--inspect")) {
          return arg;
        }
        let debugOption;
        let debugHost = "127.0.0.1";
        let debugPort = "9229";
        let match;
        if ((match = arg.match(/^(--inspect(-brk)?)$/)) !== null) {
          debugOption = match[1];
        } else if ((match = arg.match(/^(--inspect(-brk|-port)?)=([^:]+)$/)) !== null) {
          debugOption = match[1];
          if (/^\d+$/.test(match[3])) {
            debugPort = match[3];
          } else {
            debugHost = match[3];
          }
        } else if ((match = arg.match(/^(--inspect(-brk|-port)?)=([^:]+):(\d+)$/)) !== null) {
          debugOption = match[1];
          debugHost = match[3];
          debugPort = match[4];
        }
        if (debugOption && debugPort !== "0") {
          return `${debugOption}=${debugHost}:${parseInt(debugPort) + 1}`;
        }
        return arg;
      });
    }
    function useColor() {
      if (process2.env.NO_COLOR || process2.env.FORCE_COLOR === "0" || process2.env.FORCE_COLOR === "false")
        return false;
      if (process2.env.FORCE_COLOR || process2.env.CLICOLOR_FORCE !== void 0)
        return true;
      return void 0;
    }
    exports.Command = Command2;
    exports.useColor = useColor;
  }
});

// ../../node_modules/.pnpm/commander@13.1.0/node_modules/commander/index.js
var require_commander = __commonJS({
  "../../node_modules/.pnpm/commander@13.1.0/node_modules/commander/index.js"(exports) {
    "use strict";
    var { Argument: Argument2 } = require_argument();
    var { Command: Command2 } = require_command();
    var { CommanderError: CommanderError2, InvalidArgumentError: InvalidArgumentError2 } = require_error();
    var { Help: Help2 } = require_help();
    var { Option: Option2 } = require_option();
    exports.program = new Command2();
    exports.createCommand = (name) => new Command2(name);
    exports.createOption = (flags, description) => new Option2(flags, description);
    exports.createArgument = (name, description) => new Argument2(name, description);
    exports.Command = Command2;
    exports.Option = Option2;
    exports.Argument = Argument2;
    exports.Help = Help2;
    exports.CommanderError = CommanderError2;
    exports.InvalidArgumentError = InvalidArgumentError2;
    exports.InvalidOptionArgumentError = InvalidArgumentError2;
  }
});

// src/env.ts
process.removeAllListeners("warning");
process.on("warning", (warning) => {
  if (warning.name === "ExperimentalWarning" && warning.message.includes("SQLite")) return;
  process.stderr.write(`${warning.name}: ${warning.message}
`);
});

// ../../node_modules/.pnpm/commander@13.1.0/node_modules/commander/esm.mjs
var import_index = __toESM(require_commander(), 1);
var {
  program,
  createCommand,
  createArgument,
  createOption,
  CommanderError,
  InvalidArgumentError,
  InvalidOptionArgumentError,
  // deprecated old name
  Command,
  Argument,
  Option,
  Help
} = import_index.default;

// ../../node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/external.js
var external_exports = {};
__export(external_exports, {
  BRAND: () => BRAND,
  DIRTY: () => DIRTY,
  EMPTY_PATH: () => EMPTY_PATH,
  INVALID: () => INVALID,
  NEVER: () => NEVER,
  OK: () => OK,
  ParseStatus: () => ParseStatus,
  Schema: () => ZodType,
  ZodAny: () => ZodAny,
  ZodArray: () => ZodArray,
  ZodBigInt: () => ZodBigInt,
  ZodBoolean: () => ZodBoolean,
  ZodBranded: () => ZodBranded,
  ZodCatch: () => ZodCatch,
  ZodDate: () => ZodDate,
  ZodDefault: () => ZodDefault,
  ZodDiscriminatedUnion: () => ZodDiscriminatedUnion,
  ZodEffects: () => ZodEffects,
  ZodEnum: () => ZodEnum,
  ZodError: () => ZodError,
  ZodFirstPartyTypeKind: () => ZodFirstPartyTypeKind,
  ZodFunction: () => ZodFunction,
  ZodIntersection: () => ZodIntersection,
  ZodIssueCode: () => ZodIssueCode,
  ZodLazy: () => ZodLazy,
  ZodLiteral: () => ZodLiteral,
  ZodMap: () => ZodMap,
  ZodNaN: () => ZodNaN,
  ZodNativeEnum: () => ZodNativeEnum,
  ZodNever: () => ZodNever,
  ZodNull: () => ZodNull,
  ZodNullable: () => ZodNullable,
  ZodNumber: () => ZodNumber,
  ZodObject: () => ZodObject,
  ZodOptional: () => ZodOptional,
  ZodParsedType: () => ZodParsedType,
  ZodPipeline: () => ZodPipeline,
  ZodPromise: () => ZodPromise,
  ZodReadonly: () => ZodReadonly,
  ZodRecord: () => ZodRecord,
  ZodSchema: () => ZodType,
  ZodSet: () => ZodSet,
  ZodString: () => ZodString,
  ZodSymbol: () => ZodSymbol,
  ZodTransformer: () => ZodEffects,
  ZodTuple: () => ZodTuple,
  ZodType: () => ZodType,
  ZodUndefined: () => ZodUndefined,
  ZodUnion: () => ZodUnion,
  ZodUnknown: () => ZodUnknown,
  ZodVoid: () => ZodVoid,
  addIssueToContext: () => addIssueToContext,
  any: () => anyType,
  array: () => arrayType,
  bigint: () => bigIntType,
  boolean: () => booleanType,
  coerce: () => coerce,
  custom: () => custom,
  date: () => dateType,
  datetimeRegex: () => datetimeRegex,
  defaultErrorMap: () => en_default,
  discriminatedUnion: () => discriminatedUnionType,
  effect: () => effectsType,
  enum: () => enumType,
  function: () => functionType,
  getErrorMap: () => getErrorMap,
  getParsedType: () => getParsedType,
  instanceof: () => instanceOfType,
  intersection: () => intersectionType,
  isAborted: () => isAborted,
  isAsync: () => isAsync,
  isDirty: () => isDirty,
  isValid: () => isValid,
  late: () => late,
  lazy: () => lazyType,
  literal: () => literalType,
  makeIssue: () => makeIssue,
  map: () => mapType,
  nan: () => nanType,
  nativeEnum: () => nativeEnumType,
  never: () => neverType,
  null: () => nullType,
  nullable: () => nullableType,
  number: () => numberType,
  object: () => objectType,
  objectUtil: () => objectUtil,
  oboolean: () => oboolean,
  onumber: () => onumber,
  optional: () => optionalType,
  ostring: () => ostring,
  pipeline: () => pipelineType,
  preprocess: () => preprocessType,
  promise: () => promiseType,
  quotelessJson: () => quotelessJson,
  record: () => recordType,
  set: () => setType,
  setErrorMap: () => setErrorMap,
  strictObject: () => strictObjectType,
  string: () => stringType,
  symbol: () => symbolType,
  transformer: () => effectsType,
  tuple: () => tupleType,
  undefined: () => undefinedType,
  union: () => unionType,
  unknown: () => unknownType,
  util: () => util,
  void: () => voidType
});

// ../../node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/helpers/util.js
var util;
(function(util2) {
  util2.assertEqual = (_) => {
  };
  function assertIs(_arg) {
  }
  util2.assertIs = assertIs;
  function assertNever(_x) {
    throw new Error();
  }
  util2.assertNever = assertNever;
  util2.arrayToEnum = (items) => {
    const obj = {};
    for (const item of items) {
      obj[item] = item;
    }
    return obj;
  };
  util2.getValidEnumValues = (obj) => {
    const validKeys = util2.objectKeys(obj).filter((k) => typeof obj[obj[k]] !== "number");
    const filtered = {};
    for (const k of validKeys) {
      filtered[k] = obj[k];
    }
    return util2.objectValues(filtered);
  };
  util2.objectValues = (obj) => {
    return util2.objectKeys(obj).map(function(e) {
      return obj[e];
    });
  };
  util2.objectKeys = typeof Object.keys === "function" ? (obj) => Object.keys(obj) : (object) => {
    const keys = [];
    for (const key in object) {
      if (Object.prototype.hasOwnProperty.call(object, key)) {
        keys.push(key);
      }
    }
    return keys;
  };
  util2.find = (arr, checker) => {
    for (const item of arr) {
      if (checker(item))
        return item;
    }
    return void 0;
  };
  util2.isInteger = typeof Number.isInteger === "function" ? (val) => Number.isInteger(val) : (val) => typeof val === "number" && Number.isFinite(val) && Math.floor(val) === val;
  function joinValues(array, separator = " | ") {
    return array.map((val) => typeof val === "string" ? `'${val}'` : val).join(separator);
  }
  util2.joinValues = joinValues;
  util2.jsonStringifyReplacer = (_, value) => {
    if (typeof value === "bigint") {
      return value.toString();
    }
    return value;
  };
})(util || (util = {}));
var objectUtil;
(function(objectUtil2) {
  objectUtil2.mergeShapes = (first, second) => {
    return {
      ...first,
      ...second
      // second overwrites first
    };
  };
})(objectUtil || (objectUtil = {}));
var ZodParsedType = util.arrayToEnum([
  "string",
  "nan",
  "number",
  "integer",
  "float",
  "boolean",
  "date",
  "bigint",
  "symbol",
  "function",
  "undefined",
  "null",
  "array",
  "object",
  "unknown",
  "promise",
  "void",
  "never",
  "map",
  "set"
]);
var getParsedType = (data) => {
  const t = typeof data;
  switch (t) {
    case "undefined":
      return ZodParsedType.undefined;
    case "string":
      return ZodParsedType.string;
    case "number":
      return Number.isNaN(data) ? ZodParsedType.nan : ZodParsedType.number;
    case "boolean":
      return ZodParsedType.boolean;
    case "function":
      return ZodParsedType.function;
    case "bigint":
      return ZodParsedType.bigint;
    case "symbol":
      return ZodParsedType.symbol;
    case "object":
      if (Array.isArray(data)) {
        return ZodParsedType.array;
      }
      if (data === null) {
        return ZodParsedType.null;
      }
      if (data.then && typeof data.then === "function" && data.catch && typeof data.catch === "function") {
        return ZodParsedType.promise;
      }
      if (typeof Map !== "undefined" && data instanceof Map) {
        return ZodParsedType.map;
      }
      if (typeof Set !== "undefined" && data instanceof Set) {
        return ZodParsedType.set;
      }
      if (typeof Date !== "undefined" && data instanceof Date) {
        return ZodParsedType.date;
      }
      return ZodParsedType.object;
    default:
      return ZodParsedType.unknown;
  }
};

// ../../node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/ZodError.js
var ZodIssueCode = util.arrayToEnum([
  "invalid_type",
  "invalid_literal",
  "custom",
  "invalid_union",
  "invalid_union_discriminator",
  "invalid_enum_value",
  "unrecognized_keys",
  "invalid_arguments",
  "invalid_return_type",
  "invalid_date",
  "invalid_string",
  "too_small",
  "too_big",
  "invalid_intersection_types",
  "not_multiple_of",
  "not_finite"
]);
var quotelessJson = (obj) => {
  const json = JSON.stringify(obj, null, 2);
  return json.replace(/"([^"]+)":/g, "$1:");
};
var ZodError = class _ZodError extends Error {
  get errors() {
    return this.issues;
  }
  constructor(issues) {
    super();
    this.issues = [];
    this.addIssue = (sub) => {
      this.issues = [...this.issues, sub];
    };
    this.addIssues = (subs = []) => {
      this.issues = [...this.issues, ...subs];
    };
    const actualProto = new.target.prototype;
    if (Object.setPrototypeOf) {
      Object.setPrototypeOf(this, actualProto);
    } else {
      this.__proto__ = actualProto;
    }
    this.name = "ZodError";
    this.issues = issues;
  }
  format(_mapper) {
    const mapper = _mapper || function(issue) {
      return issue.message;
    };
    const fieldErrors = { _errors: [] };
    const processError = (error) => {
      for (const issue of error.issues) {
        if (issue.code === "invalid_union") {
          issue.unionErrors.map(processError);
        } else if (issue.code === "invalid_return_type") {
          processError(issue.returnTypeError);
        } else if (issue.code === "invalid_arguments") {
          processError(issue.argumentsError);
        } else if (issue.path.length === 0) {
          fieldErrors._errors.push(mapper(issue));
        } else {
          let curr = fieldErrors;
          let i = 0;
          while (i < issue.path.length) {
            const el = issue.path[i];
            const terminal = i === issue.path.length - 1;
            if (!terminal) {
              curr[el] = curr[el] || { _errors: [] };
            } else {
              curr[el] = curr[el] || { _errors: [] };
              curr[el]._errors.push(mapper(issue));
            }
            curr = curr[el];
            i++;
          }
        }
      }
    };
    processError(this);
    return fieldErrors;
  }
  static assert(value) {
    if (!(value instanceof _ZodError)) {
      throw new Error(`Not a ZodError: ${value}`);
    }
  }
  toString() {
    return this.message;
  }
  get message() {
    return JSON.stringify(this.issues, util.jsonStringifyReplacer, 2);
  }
  get isEmpty() {
    return this.issues.length === 0;
  }
  flatten(mapper = (issue) => issue.message) {
    const fieldErrors = {};
    const formErrors = [];
    for (const sub of this.issues) {
      if (sub.path.length > 0) {
        const firstEl = sub.path[0];
        fieldErrors[firstEl] = fieldErrors[firstEl] || [];
        fieldErrors[firstEl].push(mapper(sub));
      } else {
        formErrors.push(mapper(sub));
      }
    }
    return { formErrors, fieldErrors };
  }
  get formErrors() {
    return this.flatten();
  }
};
ZodError.create = (issues) => {
  const error = new ZodError(issues);
  return error;
};

// ../../node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/locales/en.js
var errorMap = (issue, _ctx) => {
  let message;
  switch (issue.code) {
    case ZodIssueCode.invalid_type:
      if (issue.received === ZodParsedType.undefined) {
        message = "Required";
      } else {
        message = `Expected ${issue.expected}, received ${issue.received}`;
      }
      break;
    case ZodIssueCode.invalid_literal:
      message = `Invalid literal value, expected ${JSON.stringify(issue.expected, util.jsonStringifyReplacer)}`;
      break;
    case ZodIssueCode.unrecognized_keys:
      message = `Unrecognized key(s) in object: ${util.joinValues(issue.keys, ", ")}`;
      break;
    case ZodIssueCode.invalid_union:
      message = `Invalid input`;
      break;
    case ZodIssueCode.invalid_union_discriminator:
      message = `Invalid discriminator value. Expected ${util.joinValues(issue.options)}`;
      break;
    case ZodIssueCode.invalid_enum_value:
      message = `Invalid enum value. Expected ${util.joinValues(issue.options)}, received '${issue.received}'`;
      break;
    case ZodIssueCode.invalid_arguments:
      message = `Invalid function arguments`;
      break;
    case ZodIssueCode.invalid_return_type:
      message = `Invalid function return type`;
      break;
    case ZodIssueCode.invalid_date:
      message = `Invalid date`;
      break;
    case ZodIssueCode.invalid_string:
      if (typeof issue.validation === "object") {
        if ("includes" in issue.validation) {
          message = `Invalid input: must include "${issue.validation.includes}"`;
          if (typeof issue.validation.position === "number") {
            message = `${message} at one or more positions greater than or equal to ${issue.validation.position}`;
          }
        } else if ("startsWith" in issue.validation) {
          message = `Invalid input: must start with "${issue.validation.startsWith}"`;
        } else if ("endsWith" in issue.validation) {
          message = `Invalid input: must end with "${issue.validation.endsWith}"`;
        } else {
          util.assertNever(issue.validation);
        }
      } else if (issue.validation !== "regex") {
        message = `Invalid ${issue.validation}`;
      } else {
        message = "Invalid";
      }
      break;
    case ZodIssueCode.too_small:
      if (issue.type === "array")
        message = `Array must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `more than`} ${issue.minimum} element(s)`;
      else if (issue.type === "string")
        message = `String must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `over`} ${issue.minimum} character(s)`;
      else if (issue.type === "number")
        message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
      else if (issue.type === "bigint")
        message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
      else if (issue.type === "date")
        message = `Date must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${new Date(Number(issue.minimum))}`;
      else
        message = "Invalid input";
      break;
    case ZodIssueCode.too_big:
      if (issue.type === "array")
        message = `Array must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `less than`} ${issue.maximum} element(s)`;
      else if (issue.type === "string")
        message = `String must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `under`} ${issue.maximum} character(s)`;
      else if (issue.type === "number")
        message = `Number must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "bigint")
        message = `BigInt must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "date")
        message = `Date must be ${issue.exact ? `exactly` : issue.inclusive ? `smaller than or equal to` : `smaller than`} ${new Date(Number(issue.maximum))}`;
      else
        message = "Invalid input";
      break;
    case ZodIssueCode.custom:
      message = `Invalid input`;
      break;
    case ZodIssueCode.invalid_intersection_types:
      message = `Intersection results could not be merged`;
      break;
    case ZodIssueCode.not_multiple_of:
      message = `Number must be a multiple of ${issue.multipleOf}`;
      break;
    case ZodIssueCode.not_finite:
      message = "Number must be finite";
      break;
    default:
      message = _ctx.defaultError;
      util.assertNever(issue);
  }
  return { message };
};
var en_default = errorMap;

// ../../node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/errors.js
var overrideErrorMap = en_default;
function setErrorMap(map) {
  overrideErrorMap = map;
}
function getErrorMap() {
  return overrideErrorMap;
}

// ../../node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/helpers/parseUtil.js
var makeIssue = (params) => {
  const { data, path, errorMaps, issueData } = params;
  const fullPath = [...path, ...issueData.path || []];
  const fullIssue = {
    ...issueData,
    path: fullPath
  };
  if (issueData.message !== void 0) {
    return {
      ...issueData,
      path: fullPath,
      message: issueData.message
    };
  }
  let errorMessage = "";
  const maps = errorMaps.filter((m) => !!m).slice().reverse();
  for (const map of maps) {
    errorMessage = map(fullIssue, { data, defaultError: errorMessage }).message;
  }
  return {
    ...issueData,
    path: fullPath,
    message: errorMessage
  };
};
var EMPTY_PATH = [];
function addIssueToContext(ctx, issueData) {
  const overrideMap = getErrorMap();
  const issue = makeIssue({
    issueData,
    data: ctx.data,
    path: ctx.path,
    errorMaps: [
      ctx.common.contextualErrorMap,
      // contextual error map is first priority
      ctx.schemaErrorMap,
      // then schema-bound map if available
      overrideMap,
      // then global override map
      overrideMap === en_default ? void 0 : en_default
      // then global default map
    ].filter((x) => !!x)
  });
  ctx.common.issues.push(issue);
}
var ParseStatus = class _ParseStatus {
  constructor() {
    this.value = "valid";
  }
  dirty() {
    if (this.value === "valid")
      this.value = "dirty";
  }
  abort() {
    if (this.value !== "aborted")
      this.value = "aborted";
  }
  static mergeArray(status, results) {
    const arrayValue = [];
    for (const s of results) {
      if (s.status === "aborted")
        return INVALID;
      if (s.status === "dirty")
        status.dirty();
      arrayValue.push(s.value);
    }
    return { status: status.value, value: arrayValue };
  }
  static async mergeObjectAsync(status, pairs) {
    const syncPairs = [];
    for (const pair of pairs) {
      const key = await pair.key;
      const value = await pair.value;
      syncPairs.push({
        key,
        value
      });
    }
    return _ParseStatus.mergeObjectSync(status, syncPairs);
  }
  static mergeObjectSync(status, pairs) {
    const finalObject = {};
    for (const pair of pairs) {
      const { key, value } = pair;
      if (key.status === "aborted")
        return INVALID;
      if (value.status === "aborted")
        return INVALID;
      if (key.status === "dirty")
        status.dirty();
      if (value.status === "dirty")
        status.dirty();
      if (key.value !== "__proto__" && (typeof value.value !== "undefined" || pair.alwaysSet)) {
        finalObject[key.value] = value.value;
      }
    }
    return { status: status.value, value: finalObject };
  }
};
var INVALID = Object.freeze({
  status: "aborted"
});
var DIRTY = (value) => ({ status: "dirty", value });
var OK = (value) => ({ status: "valid", value });
var isAborted = (x) => x.status === "aborted";
var isDirty = (x) => x.status === "dirty";
var isValid = (x) => x.status === "valid";
var isAsync = (x) => typeof Promise !== "undefined" && x instanceof Promise;

// ../../node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/helpers/errorUtil.js
var errorUtil;
(function(errorUtil2) {
  errorUtil2.errToObj = (message) => typeof message === "string" ? { message } : message || {};
  errorUtil2.toString = (message) => typeof message === "string" ? message : message?.message;
})(errorUtil || (errorUtil = {}));

// ../../node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/types.js
var ParseInputLazyPath = class {
  constructor(parent, value, path, key) {
    this._cachedPath = [];
    this.parent = parent;
    this.data = value;
    this._path = path;
    this._key = key;
  }
  get path() {
    if (!this._cachedPath.length) {
      if (Array.isArray(this._key)) {
        this._cachedPath.push(...this._path, ...this._key);
      } else {
        this._cachedPath.push(...this._path, this._key);
      }
    }
    return this._cachedPath;
  }
};
var handleResult = (ctx, result) => {
  if (isValid(result)) {
    return { success: true, data: result.value };
  } else {
    if (!ctx.common.issues.length) {
      throw new Error("Validation failed but no issues detected.");
    }
    return {
      success: false,
      get error() {
        if (this._error)
          return this._error;
        const error = new ZodError(ctx.common.issues);
        this._error = error;
        return this._error;
      }
    };
  }
};
function processCreateParams(params) {
  if (!params)
    return {};
  const { errorMap: errorMap2, invalid_type_error, required_error, description } = params;
  if (errorMap2 && (invalid_type_error || required_error)) {
    throw new Error(`Can't use "invalid_type_error" or "required_error" in conjunction with custom error map.`);
  }
  if (errorMap2)
    return { errorMap: errorMap2, description };
  const customMap = (iss, ctx) => {
    const { message } = params;
    if (iss.code === "invalid_enum_value") {
      return { message: message ?? ctx.defaultError };
    }
    if (typeof ctx.data === "undefined") {
      return { message: message ?? required_error ?? ctx.defaultError };
    }
    if (iss.code !== "invalid_type")
      return { message: ctx.defaultError };
    return { message: message ?? invalid_type_error ?? ctx.defaultError };
  };
  return { errorMap: customMap, description };
}
var ZodType = class {
  get description() {
    return this._def.description;
  }
  _getType(input) {
    return getParsedType(input.data);
  }
  _getOrReturnCtx(input, ctx) {
    return ctx || {
      common: input.parent.common,
      data: input.data,
      parsedType: getParsedType(input.data),
      schemaErrorMap: this._def.errorMap,
      path: input.path,
      parent: input.parent
    };
  }
  _processInputParams(input) {
    return {
      status: new ParseStatus(),
      ctx: {
        common: input.parent.common,
        data: input.data,
        parsedType: getParsedType(input.data),
        schemaErrorMap: this._def.errorMap,
        path: input.path,
        parent: input.parent
      }
    };
  }
  _parseSync(input) {
    const result = this._parse(input);
    if (isAsync(result)) {
      throw new Error("Synchronous parse encountered promise.");
    }
    return result;
  }
  _parseAsync(input) {
    const result = this._parse(input);
    return Promise.resolve(result);
  }
  parse(data, params) {
    const result = this.safeParse(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  safeParse(data, params) {
    const ctx = {
      common: {
        issues: [],
        async: params?.async ?? false,
        contextualErrorMap: params?.errorMap
      },
      path: params?.path || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    const result = this._parseSync({ data, path: ctx.path, parent: ctx });
    return handleResult(ctx, result);
  }
  "~validate"(data) {
    const ctx = {
      common: {
        issues: [],
        async: !!this["~standard"].async
      },
      path: [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    if (!this["~standard"].async) {
      try {
        const result = this._parseSync({ data, path: [], parent: ctx });
        return isValid(result) ? {
          value: result.value
        } : {
          issues: ctx.common.issues
        };
      } catch (err) {
        if (err?.message?.toLowerCase()?.includes("encountered")) {
          this["~standard"].async = true;
        }
        ctx.common = {
          issues: [],
          async: true
        };
      }
    }
    return this._parseAsync({ data, path: [], parent: ctx }).then((result) => isValid(result) ? {
      value: result.value
    } : {
      issues: ctx.common.issues
    });
  }
  async parseAsync(data, params) {
    const result = await this.safeParseAsync(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  async safeParseAsync(data, params) {
    const ctx = {
      common: {
        issues: [],
        contextualErrorMap: params?.errorMap,
        async: true
      },
      path: params?.path || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    const maybeAsyncResult = this._parse({ data, path: ctx.path, parent: ctx });
    const result = await (isAsync(maybeAsyncResult) ? maybeAsyncResult : Promise.resolve(maybeAsyncResult));
    return handleResult(ctx, result);
  }
  refine(check, message) {
    const getIssueProperties = (val) => {
      if (typeof message === "string" || typeof message === "undefined") {
        return { message };
      } else if (typeof message === "function") {
        return message(val);
      } else {
        return message;
      }
    };
    return this._refinement((val, ctx) => {
      const result = check(val);
      const setError = () => ctx.addIssue({
        code: ZodIssueCode.custom,
        ...getIssueProperties(val)
      });
      if (typeof Promise !== "undefined" && result instanceof Promise) {
        return result.then((data) => {
          if (!data) {
            setError();
            return false;
          } else {
            return true;
          }
        });
      }
      if (!result) {
        setError();
        return false;
      } else {
        return true;
      }
    });
  }
  refinement(check, refinementData) {
    return this._refinement((val, ctx) => {
      if (!check(val)) {
        ctx.addIssue(typeof refinementData === "function" ? refinementData(val, ctx) : refinementData);
        return false;
      } else {
        return true;
      }
    });
  }
  _refinement(refinement) {
    return new ZodEffects({
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "refinement", refinement }
    });
  }
  superRefine(refinement) {
    return this._refinement(refinement);
  }
  constructor(def) {
    this.spa = this.safeParseAsync;
    this._def = def;
    this.parse = this.parse.bind(this);
    this.safeParse = this.safeParse.bind(this);
    this.parseAsync = this.parseAsync.bind(this);
    this.safeParseAsync = this.safeParseAsync.bind(this);
    this.spa = this.spa.bind(this);
    this.refine = this.refine.bind(this);
    this.refinement = this.refinement.bind(this);
    this.superRefine = this.superRefine.bind(this);
    this.optional = this.optional.bind(this);
    this.nullable = this.nullable.bind(this);
    this.nullish = this.nullish.bind(this);
    this.array = this.array.bind(this);
    this.promise = this.promise.bind(this);
    this.or = this.or.bind(this);
    this.and = this.and.bind(this);
    this.transform = this.transform.bind(this);
    this.brand = this.brand.bind(this);
    this.default = this.default.bind(this);
    this.catch = this.catch.bind(this);
    this.describe = this.describe.bind(this);
    this.pipe = this.pipe.bind(this);
    this.readonly = this.readonly.bind(this);
    this.isNullable = this.isNullable.bind(this);
    this.isOptional = this.isOptional.bind(this);
    this["~standard"] = {
      version: 1,
      vendor: "zod",
      validate: (data) => this["~validate"](data)
    };
  }
  optional() {
    return ZodOptional.create(this, this._def);
  }
  nullable() {
    return ZodNullable.create(this, this._def);
  }
  nullish() {
    return this.nullable().optional();
  }
  array() {
    return ZodArray.create(this);
  }
  promise() {
    return ZodPromise.create(this, this._def);
  }
  or(option) {
    return ZodUnion.create([this, option], this._def);
  }
  and(incoming) {
    return ZodIntersection.create(this, incoming, this._def);
  }
  transform(transform) {
    return new ZodEffects({
      ...processCreateParams(this._def),
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "transform", transform }
    });
  }
  default(def) {
    const defaultValueFunc = typeof def === "function" ? def : () => def;
    return new ZodDefault({
      ...processCreateParams(this._def),
      innerType: this,
      defaultValue: defaultValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodDefault
    });
  }
  brand() {
    return new ZodBranded({
      typeName: ZodFirstPartyTypeKind.ZodBranded,
      type: this,
      ...processCreateParams(this._def)
    });
  }
  catch(def) {
    const catchValueFunc = typeof def === "function" ? def : () => def;
    return new ZodCatch({
      ...processCreateParams(this._def),
      innerType: this,
      catchValue: catchValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodCatch
    });
  }
  describe(description) {
    const This = this.constructor;
    return new This({
      ...this._def,
      description
    });
  }
  pipe(target) {
    return ZodPipeline.create(this, target);
  }
  readonly() {
    return ZodReadonly.create(this);
  }
  isOptional() {
    return this.safeParse(void 0).success;
  }
  isNullable() {
    return this.safeParse(null).success;
  }
};
var cuidRegex = /^c[^\s-]{8,}$/i;
var cuid2Regex = /^[0-9a-z]+$/;
var ulidRegex = /^[0-9A-HJKMNP-TV-Z]{26}$/i;
var uuidRegex = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i;
var nanoidRegex = /^[a-z0-9_-]{21}$/i;
var jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
var durationRegex = /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/;
var emailRegex = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i;
var _emojiRegex = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`;
var emojiRegex;
var ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
var ipv4CidrRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/;
var ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
var ipv6CidrRegex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
var base64Regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
var base64urlRegex = /^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/;
var dateRegexSource = `((\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-((0[13578]|1[02])-(0[1-9]|[12]\\d|3[01])|(0[469]|11)-(0[1-9]|[12]\\d|30)|(02)-(0[1-9]|1\\d|2[0-8])))`;
var dateRegex = new RegExp(`^${dateRegexSource}$`);
function timeRegexSource(args) {
  let secondsRegexSource = `[0-5]\\d`;
  if (args.precision) {
    secondsRegexSource = `${secondsRegexSource}\\.\\d{${args.precision}}`;
  } else if (args.precision == null) {
    secondsRegexSource = `${secondsRegexSource}(\\.\\d+)?`;
  }
  const secondsQuantifier = args.precision ? "+" : "?";
  return `([01]\\d|2[0-3]):[0-5]\\d(:${secondsRegexSource})${secondsQuantifier}`;
}
function timeRegex(args) {
  return new RegExp(`^${timeRegexSource(args)}$`);
}
function datetimeRegex(args) {
  let regex = `${dateRegexSource}T${timeRegexSource(args)}`;
  const opts = [];
  opts.push(args.local ? `Z?` : `Z`);
  if (args.offset)
    opts.push(`([+-]\\d{2}:?\\d{2})`);
  regex = `${regex}(${opts.join("|")})`;
  return new RegExp(`^${regex}$`);
}
function isValidIP(ip, version) {
  if ((version === "v4" || !version) && ipv4Regex.test(ip)) {
    return true;
  }
  if ((version === "v6" || !version) && ipv6Regex.test(ip)) {
    return true;
  }
  return false;
}
function isValidJWT(jwt, alg) {
  if (!jwtRegex.test(jwt))
    return false;
  try {
    const [header] = jwt.split(".");
    if (!header)
      return false;
    const base64 = header.replace(/-/g, "+").replace(/_/g, "/").padEnd(header.length + (4 - header.length % 4) % 4, "=");
    const decoded = JSON.parse(atob(base64));
    if (typeof decoded !== "object" || decoded === null)
      return false;
    if ("typ" in decoded && decoded?.typ !== "JWT")
      return false;
    if (!decoded.alg)
      return false;
    if (alg && decoded.alg !== alg)
      return false;
    return true;
  } catch {
    return false;
  }
}
function isValidCidr(ip, version) {
  if ((version === "v4" || !version) && ipv4CidrRegex.test(ip)) {
    return true;
  }
  if ((version === "v6" || !version) && ipv6CidrRegex.test(ip)) {
    return true;
  }
  return false;
}
var ZodString = class _ZodString extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = String(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.string) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.string,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    const status = new ParseStatus();
    let ctx = void 0;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        if (input.data.length < check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: check.value,
            type: "string",
            inclusive: true,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        if (input.data.length > check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: check.value,
            type: "string",
            inclusive: true,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "length") {
        const tooBig = input.data.length > check.value;
        const tooSmall = input.data.length < check.value;
        if (tooBig || tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          if (tooBig) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_big,
              maximum: check.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check.message
            });
          } else if (tooSmall) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_small,
              minimum: check.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check.message
            });
          }
          status.dirty();
        }
      } else if (check.kind === "email") {
        if (!emailRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "email",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "emoji") {
        if (!emojiRegex) {
          emojiRegex = new RegExp(_emojiRegex, "u");
        }
        if (!emojiRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "emoji",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "uuid") {
        if (!uuidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "uuid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "nanoid") {
        if (!nanoidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "nanoid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cuid") {
        if (!cuidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cuid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cuid2") {
        if (!cuid2Regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cuid2",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "ulid") {
        if (!ulidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "ulid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "url") {
        try {
          new URL(input.data);
        } catch {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "url",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "regex") {
        check.regex.lastIndex = 0;
        const testResult = check.regex.test(input.data);
        if (!testResult) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "regex",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "trim") {
        input.data = input.data.trim();
      } else if (check.kind === "includes") {
        if (!input.data.includes(check.value, check.position)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { includes: check.value, position: check.position },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "toLowerCase") {
        input.data = input.data.toLowerCase();
      } else if (check.kind === "toUpperCase") {
        input.data = input.data.toUpperCase();
      } else if (check.kind === "startsWith") {
        if (!input.data.startsWith(check.value)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { startsWith: check.value },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "endsWith") {
        if (!input.data.endsWith(check.value)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { endsWith: check.value },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "datetime") {
        const regex = datetimeRegex(check);
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "datetime",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "date") {
        const regex = dateRegex;
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "date",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "time") {
        const regex = timeRegex(check);
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "time",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "duration") {
        if (!durationRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "duration",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "ip") {
        if (!isValidIP(input.data, check.version)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "ip",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "jwt") {
        if (!isValidJWT(input.data, check.alg)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "jwt",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cidr") {
        if (!isValidCidr(input.data, check.version)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cidr",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "base64") {
        if (!base64Regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "base64",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "base64url") {
        if (!base64urlRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "base64url",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  _regex(regex, validation, message) {
    return this.refinement((data) => regex.test(data), {
      validation,
      code: ZodIssueCode.invalid_string,
      ...errorUtil.errToObj(message)
    });
  }
  _addCheck(check) {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  email(message) {
    return this._addCheck({ kind: "email", ...errorUtil.errToObj(message) });
  }
  url(message) {
    return this._addCheck({ kind: "url", ...errorUtil.errToObj(message) });
  }
  emoji(message) {
    return this._addCheck({ kind: "emoji", ...errorUtil.errToObj(message) });
  }
  uuid(message) {
    return this._addCheck({ kind: "uuid", ...errorUtil.errToObj(message) });
  }
  nanoid(message) {
    return this._addCheck({ kind: "nanoid", ...errorUtil.errToObj(message) });
  }
  cuid(message) {
    return this._addCheck({ kind: "cuid", ...errorUtil.errToObj(message) });
  }
  cuid2(message) {
    return this._addCheck({ kind: "cuid2", ...errorUtil.errToObj(message) });
  }
  ulid(message) {
    return this._addCheck({ kind: "ulid", ...errorUtil.errToObj(message) });
  }
  base64(message) {
    return this._addCheck({ kind: "base64", ...errorUtil.errToObj(message) });
  }
  base64url(message) {
    return this._addCheck({
      kind: "base64url",
      ...errorUtil.errToObj(message)
    });
  }
  jwt(options) {
    return this._addCheck({ kind: "jwt", ...errorUtil.errToObj(options) });
  }
  ip(options) {
    return this._addCheck({ kind: "ip", ...errorUtil.errToObj(options) });
  }
  cidr(options) {
    return this._addCheck({ kind: "cidr", ...errorUtil.errToObj(options) });
  }
  datetime(options) {
    if (typeof options === "string") {
      return this._addCheck({
        kind: "datetime",
        precision: null,
        offset: false,
        local: false,
        message: options
      });
    }
    return this._addCheck({
      kind: "datetime",
      precision: typeof options?.precision === "undefined" ? null : options?.precision,
      offset: options?.offset ?? false,
      local: options?.local ?? false,
      ...errorUtil.errToObj(options?.message)
    });
  }
  date(message) {
    return this._addCheck({ kind: "date", message });
  }
  time(options) {
    if (typeof options === "string") {
      return this._addCheck({
        kind: "time",
        precision: null,
        message: options
      });
    }
    return this._addCheck({
      kind: "time",
      precision: typeof options?.precision === "undefined" ? null : options?.precision,
      ...errorUtil.errToObj(options?.message)
    });
  }
  duration(message) {
    return this._addCheck({ kind: "duration", ...errorUtil.errToObj(message) });
  }
  regex(regex, message) {
    return this._addCheck({
      kind: "regex",
      regex,
      ...errorUtil.errToObj(message)
    });
  }
  includes(value, options) {
    return this._addCheck({
      kind: "includes",
      value,
      position: options?.position,
      ...errorUtil.errToObj(options?.message)
    });
  }
  startsWith(value, message) {
    return this._addCheck({
      kind: "startsWith",
      value,
      ...errorUtil.errToObj(message)
    });
  }
  endsWith(value, message) {
    return this._addCheck({
      kind: "endsWith",
      value,
      ...errorUtil.errToObj(message)
    });
  }
  min(minLength, message) {
    return this._addCheck({
      kind: "min",
      value: minLength,
      ...errorUtil.errToObj(message)
    });
  }
  max(maxLength, message) {
    return this._addCheck({
      kind: "max",
      value: maxLength,
      ...errorUtil.errToObj(message)
    });
  }
  length(len, message) {
    return this._addCheck({
      kind: "length",
      value: len,
      ...errorUtil.errToObj(message)
    });
  }
  /**
   * Equivalent to `.min(1)`
   */
  nonempty(message) {
    return this.min(1, errorUtil.errToObj(message));
  }
  trim() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "trim" }]
    });
  }
  toLowerCase() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toLowerCase" }]
    });
  }
  toUpperCase() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toUpperCase" }]
    });
  }
  get isDatetime() {
    return !!this._def.checks.find((ch) => ch.kind === "datetime");
  }
  get isDate() {
    return !!this._def.checks.find((ch) => ch.kind === "date");
  }
  get isTime() {
    return !!this._def.checks.find((ch) => ch.kind === "time");
  }
  get isDuration() {
    return !!this._def.checks.find((ch) => ch.kind === "duration");
  }
  get isEmail() {
    return !!this._def.checks.find((ch) => ch.kind === "email");
  }
  get isURL() {
    return !!this._def.checks.find((ch) => ch.kind === "url");
  }
  get isEmoji() {
    return !!this._def.checks.find((ch) => ch.kind === "emoji");
  }
  get isUUID() {
    return !!this._def.checks.find((ch) => ch.kind === "uuid");
  }
  get isNANOID() {
    return !!this._def.checks.find((ch) => ch.kind === "nanoid");
  }
  get isCUID() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid");
  }
  get isCUID2() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid2");
  }
  get isULID() {
    return !!this._def.checks.find((ch) => ch.kind === "ulid");
  }
  get isIP() {
    return !!this._def.checks.find((ch) => ch.kind === "ip");
  }
  get isCIDR() {
    return !!this._def.checks.find((ch) => ch.kind === "cidr");
  }
  get isBase64() {
    return !!this._def.checks.find((ch) => ch.kind === "base64");
  }
  get isBase64url() {
    return !!this._def.checks.find((ch) => ch.kind === "base64url");
  }
  get minLength() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxLength() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
};
ZodString.create = (params) => {
  return new ZodString({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodString,
    coerce: params?.coerce ?? false,
    ...processCreateParams(params)
  });
};
function floatSafeRemainder(val, step) {
  const valDecCount = (val.toString().split(".")[1] || "").length;
  const stepDecCount = (step.toString().split(".")[1] || "").length;
  const decCount = valDecCount > stepDecCount ? valDecCount : stepDecCount;
  const valInt = Number.parseInt(val.toFixed(decCount).replace(".", ""));
  const stepInt = Number.parseInt(step.toFixed(decCount).replace(".", ""));
  return valInt % stepInt / 10 ** decCount;
}
var ZodNumber = class _ZodNumber extends ZodType {
  constructor() {
    super(...arguments);
    this.min = this.gte;
    this.max = this.lte;
    this.step = this.multipleOf;
  }
  _parse(input) {
    if (this._def.coerce) {
      input.data = Number(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.number) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.number,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    let ctx = void 0;
    const status = new ParseStatus();
    for (const check of this._def.checks) {
      if (check.kind === "int") {
        if (!util.isInteger(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_type,
            expected: "integer",
            received: "float",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "min") {
        const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: check.value,
            type: "number",
            inclusive: check.inclusive,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: check.value,
            type: "number",
            inclusive: check.inclusive,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "multipleOf") {
        if (floatSafeRemainder(input.data, check.value) !== 0) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_multiple_of,
            multipleOf: check.value,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "finite") {
        if (!Number.isFinite(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_finite,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  gte(value, message) {
    return this.setLimit("min", value, true, errorUtil.toString(message));
  }
  gt(value, message) {
    return this.setLimit("min", value, false, errorUtil.toString(message));
  }
  lte(value, message) {
    return this.setLimit("max", value, true, errorUtil.toString(message));
  }
  lt(value, message) {
    return this.setLimit("max", value, false, errorUtil.toString(message));
  }
  setLimit(kind, value, inclusive, message) {
    return new _ZodNumber({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value,
          inclusive,
          message: errorUtil.toString(message)
        }
      ]
    });
  }
  _addCheck(check) {
    return new _ZodNumber({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  int(message) {
    return this._addCheck({
      kind: "int",
      message: errorUtil.toString(message)
    });
  }
  positive(message) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  negative(message) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  nonpositive(message) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  nonnegative(message) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  multipleOf(value, message) {
    return this._addCheck({
      kind: "multipleOf",
      value,
      message: errorUtil.toString(message)
    });
  }
  finite(message) {
    return this._addCheck({
      kind: "finite",
      message: errorUtil.toString(message)
    });
  }
  safe(message) {
    return this._addCheck({
      kind: "min",
      inclusive: true,
      value: Number.MIN_SAFE_INTEGER,
      message: errorUtil.toString(message)
    })._addCheck({
      kind: "max",
      inclusive: true,
      value: Number.MAX_SAFE_INTEGER,
      message: errorUtil.toString(message)
    });
  }
  get minValue() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxValue() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
  get isInt() {
    return !!this._def.checks.find((ch) => ch.kind === "int" || ch.kind === "multipleOf" && util.isInteger(ch.value));
  }
  get isFinite() {
    let max = null;
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "finite" || ch.kind === "int" || ch.kind === "multipleOf") {
        return true;
      } else if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      } else if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return Number.isFinite(min) && Number.isFinite(max);
  }
};
ZodNumber.create = (params) => {
  return new ZodNumber({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodNumber,
    coerce: params?.coerce || false,
    ...processCreateParams(params)
  });
};
var ZodBigInt = class _ZodBigInt extends ZodType {
  constructor() {
    super(...arguments);
    this.min = this.gte;
    this.max = this.lte;
  }
  _parse(input) {
    if (this._def.coerce) {
      try {
        input.data = BigInt(input.data);
      } catch {
        return this._getInvalidInput(input);
      }
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.bigint) {
      return this._getInvalidInput(input);
    }
    let ctx = void 0;
    const status = new ParseStatus();
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            type: "bigint",
            minimum: check.value,
            inclusive: check.inclusive,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            type: "bigint",
            maximum: check.value,
            inclusive: check.inclusive,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "multipleOf") {
        if (input.data % check.value !== BigInt(0)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_multiple_of,
            multipleOf: check.value,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  _getInvalidInput(input) {
    const ctx = this._getOrReturnCtx(input);
    addIssueToContext(ctx, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.bigint,
      received: ctx.parsedType
    });
    return INVALID;
  }
  gte(value, message) {
    return this.setLimit("min", value, true, errorUtil.toString(message));
  }
  gt(value, message) {
    return this.setLimit("min", value, false, errorUtil.toString(message));
  }
  lte(value, message) {
    return this.setLimit("max", value, true, errorUtil.toString(message));
  }
  lt(value, message) {
    return this.setLimit("max", value, false, errorUtil.toString(message));
  }
  setLimit(kind, value, inclusive, message) {
    return new _ZodBigInt({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value,
          inclusive,
          message: errorUtil.toString(message)
        }
      ]
    });
  }
  _addCheck(check) {
    return new _ZodBigInt({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  positive(message) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  negative(message) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  nonpositive(message) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  nonnegative(message) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  multipleOf(value, message) {
    return this._addCheck({
      kind: "multipleOf",
      value,
      message: errorUtil.toString(message)
    });
  }
  get minValue() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxValue() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
};
ZodBigInt.create = (params) => {
  return new ZodBigInt({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodBigInt,
    coerce: params?.coerce ?? false,
    ...processCreateParams(params)
  });
};
var ZodBoolean = class extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = Boolean(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.boolean) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.boolean,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodBoolean.create = (params) => {
  return new ZodBoolean({
    typeName: ZodFirstPartyTypeKind.ZodBoolean,
    coerce: params?.coerce || false,
    ...processCreateParams(params)
  });
};
var ZodDate = class _ZodDate extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = new Date(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.date) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.date,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    if (Number.isNaN(input.data.getTime())) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_date
      });
      return INVALID;
    }
    const status = new ParseStatus();
    let ctx = void 0;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        if (input.data.getTime() < check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            message: check.message,
            inclusive: true,
            exact: false,
            minimum: check.value,
            type: "date"
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        if (input.data.getTime() > check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            message: check.message,
            inclusive: true,
            exact: false,
            maximum: check.value,
            type: "date"
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return {
      status: status.value,
      value: new Date(input.data.getTime())
    };
  }
  _addCheck(check) {
    return new _ZodDate({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  min(minDate, message) {
    return this._addCheck({
      kind: "min",
      value: minDate.getTime(),
      message: errorUtil.toString(message)
    });
  }
  max(maxDate, message) {
    return this._addCheck({
      kind: "max",
      value: maxDate.getTime(),
      message: errorUtil.toString(message)
    });
  }
  get minDate() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min != null ? new Date(min) : null;
  }
  get maxDate() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max != null ? new Date(max) : null;
  }
};
ZodDate.create = (params) => {
  return new ZodDate({
    checks: [],
    coerce: params?.coerce || false,
    typeName: ZodFirstPartyTypeKind.ZodDate,
    ...processCreateParams(params)
  });
};
var ZodSymbol = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.symbol) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.symbol,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodSymbol.create = (params) => {
  return new ZodSymbol({
    typeName: ZodFirstPartyTypeKind.ZodSymbol,
    ...processCreateParams(params)
  });
};
var ZodUndefined = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.undefined) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.undefined,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodUndefined.create = (params) => {
  return new ZodUndefined({
    typeName: ZodFirstPartyTypeKind.ZodUndefined,
    ...processCreateParams(params)
  });
};
var ZodNull = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.null) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.null,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodNull.create = (params) => {
  return new ZodNull({
    typeName: ZodFirstPartyTypeKind.ZodNull,
    ...processCreateParams(params)
  });
};
var ZodAny = class extends ZodType {
  constructor() {
    super(...arguments);
    this._any = true;
  }
  _parse(input) {
    return OK(input.data);
  }
};
ZodAny.create = (params) => {
  return new ZodAny({
    typeName: ZodFirstPartyTypeKind.ZodAny,
    ...processCreateParams(params)
  });
};
var ZodUnknown = class extends ZodType {
  constructor() {
    super(...arguments);
    this._unknown = true;
  }
  _parse(input) {
    return OK(input.data);
  }
};
ZodUnknown.create = (params) => {
  return new ZodUnknown({
    typeName: ZodFirstPartyTypeKind.ZodUnknown,
    ...processCreateParams(params)
  });
};
var ZodNever = class extends ZodType {
  _parse(input) {
    const ctx = this._getOrReturnCtx(input);
    addIssueToContext(ctx, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.never,
      received: ctx.parsedType
    });
    return INVALID;
  }
};
ZodNever.create = (params) => {
  return new ZodNever({
    typeName: ZodFirstPartyTypeKind.ZodNever,
    ...processCreateParams(params)
  });
};
var ZodVoid = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.undefined) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.void,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodVoid.create = (params) => {
  return new ZodVoid({
    typeName: ZodFirstPartyTypeKind.ZodVoid,
    ...processCreateParams(params)
  });
};
var ZodArray = class _ZodArray extends ZodType {
  _parse(input) {
    const { ctx, status } = this._processInputParams(input);
    const def = this._def;
    if (ctx.parsedType !== ZodParsedType.array) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType
      });
      return INVALID;
    }
    if (def.exactLength !== null) {
      const tooBig = ctx.data.length > def.exactLength.value;
      const tooSmall = ctx.data.length < def.exactLength.value;
      if (tooBig || tooSmall) {
        addIssueToContext(ctx, {
          code: tooBig ? ZodIssueCode.too_big : ZodIssueCode.too_small,
          minimum: tooSmall ? def.exactLength.value : void 0,
          maximum: tooBig ? def.exactLength.value : void 0,
          type: "array",
          inclusive: true,
          exact: true,
          message: def.exactLength.message
        });
        status.dirty();
      }
    }
    if (def.minLength !== null) {
      if (ctx.data.length < def.minLength.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: def.minLength.value,
          type: "array",
          inclusive: true,
          exact: false,
          message: def.minLength.message
        });
        status.dirty();
      }
    }
    if (def.maxLength !== null) {
      if (ctx.data.length > def.maxLength.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: def.maxLength.value,
          type: "array",
          inclusive: true,
          exact: false,
          message: def.maxLength.message
        });
        status.dirty();
      }
    }
    if (ctx.common.async) {
      return Promise.all([...ctx.data].map((item, i) => {
        return def.type._parseAsync(new ParseInputLazyPath(ctx, item, ctx.path, i));
      })).then((result2) => {
        return ParseStatus.mergeArray(status, result2);
      });
    }
    const result = [...ctx.data].map((item, i) => {
      return def.type._parseSync(new ParseInputLazyPath(ctx, item, ctx.path, i));
    });
    return ParseStatus.mergeArray(status, result);
  }
  get element() {
    return this._def.type;
  }
  min(minLength, message) {
    return new _ZodArray({
      ...this._def,
      minLength: { value: minLength, message: errorUtil.toString(message) }
    });
  }
  max(maxLength, message) {
    return new _ZodArray({
      ...this._def,
      maxLength: { value: maxLength, message: errorUtil.toString(message) }
    });
  }
  length(len, message) {
    return new _ZodArray({
      ...this._def,
      exactLength: { value: len, message: errorUtil.toString(message) }
    });
  }
  nonempty(message) {
    return this.min(1, message);
  }
};
ZodArray.create = (schema, params) => {
  return new ZodArray({
    type: schema,
    minLength: null,
    maxLength: null,
    exactLength: null,
    typeName: ZodFirstPartyTypeKind.ZodArray,
    ...processCreateParams(params)
  });
};
function deepPartialify(schema) {
  if (schema instanceof ZodObject) {
    const newShape = {};
    for (const key in schema.shape) {
      const fieldSchema = schema.shape[key];
      newShape[key] = ZodOptional.create(deepPartialify(fieldSchema));
    }
    return new ZodObject({
      ...schema._def,
      shape: () => newShape
    });
  } else if (schema instanceof ZodArray) {
    return new ZodArray({
      ...schema._def,
      type: deepPartialify(schema.element)
    });
  } else if (schema instanceof ZodOptional) {
    return ZodOptional.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodNullable) {
    return ZodNullable.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodTuple) {
    return ZodTuple.create(schema.items.map((item) => deepPartialify(item)));
  } else {
    return schema;
  }
}
var ZodObject = class _ZodObject extends ZodType {
  constructor() {
    super(...arguments);
    this._cached = null;
    this.nonstrict = this.passthrough;
    this.augment = this.extend;
  }
  _getCached() {
    if (this._cached !== null)
      return this._cached;
    const shape = this._def.shape();
    const keys = util.objectKeys(shape);
    this._cached = { shape, keys };
    return this._cached;
  }
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.object) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    const { status, ctx } = this._processInputParams(input);
    const { shape, keys: shapeKeys } = this._getCached();
    const extraKeys = [];
    if (!(this._def.catchall instanceof ZodNever && this._def.unknownKeys === "strip")) {
      for (const key in ctx.data) {
        if (!shapeKeys.includes(key)) {
          extraKeys.push(key);
        }
      }
    }
    const pairs = [];
    for (const key of shapeKeys) {
      const keyValidator = shape[key];
      const value = ctx.data[key];
      pairs.push({
        key: { status: "valid", value: key },
        value: keyValidator._parse(new ParseInputLazyPath(ctx, value, ctx.path, key)),
        alwaysSet: key in ctx.data
      });
    }
    if (this._def.catchall instanceof ZodNever) {
      const unknownKeys = this._def.unknownKeys;
      if (unknownKeys === "passthrough") {
        for (const key of extraKeys) {
          pairs.push({
            key: { status: "valid", value: key },
            value: { status: "valid", value: ctx.data[key] }
          });
        }
      } else if (unknownKeys === "strict") {
        if (extraKeys.length > 0) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.unrecognized_keys,
            keys: extraKeys
          });
          status.dirty();
        }
      } else if (unknownKeys === "strip") {
      } else {
        throw new Error(`Internal ZodObject error: invalid unknownKeys value.`);
      }
    } else {
      const catchall = this._def.catchall;
      for (const key of extraKeys) {
        const value = ctx.data[key];
        pairs.push({
          key: { status: "valid", value: key },
          value: catchall._parse(
            new ParseInputLazyPath(ctx, value, ctx.path, key)
            //, ctx.child(key), value, getParsedType(value)
          ),
          alwaysSet: key in ctx.data
        });
      }
    }
    if (ctx.common.async) {
      return Promise.resolve().then(async () => {
        const syncPairs = [];
        for (const pair of pairs) {
          const key = await pair.key;
          const value = await pair.value;
          syncPairs.push({
            key,
            value,
            alwaysSet: pair.alwaysSet
          });
        }
        return syncPairs;
      }).then((syncPairs) => {
        return ParseStatus.mergeObjectSync(status, syncPairs);
      });
    } else {
      return ParseStatus.mergeObjectSync(status, pairs);
    }
  }
  get shape() {
    return this._def.shape();
  }
  strict(message) {
    errorUtil.errToObj;
    return new _ZodObject({
      ...this._def,
      unknownKeys: "strict",
      ...message !== void 0 ? {
        errorMap: (issue, ctx) => {
          const defaultError = this._def.errorMap?.(issue, ctx).message ?? ctx.defaultError;
          if (issue.code === "unrecognized_keys")
            return {
              message: errorUtil.errToObj(message).message ?? defaultError
            };
          return {
            message: defaultError
          };
        }
      } : {}
    });
  }
  strip() {
    return new _ZodObject({
      ...this._def,
      unknownKeys: "strip"
    });
  }
  passthrough() {
    return new _ZodObject({
      ...this._def,
      unknownKeys: "passthrough"
    });
  }
  // const AugmentFactory =
  //   <Def extends ZodObjectDef>(def: Def) =>
  //   <Augmentation extends ZodRawShape>(
  //     augmentation: Augmentation
  //   ): ZodObject<
  //     extendShape<ReturnType<Def["shape"]>, Augmentation>,
  //     Def["unknownKeys"],
  //     Def["catchall"]
  //   > => {
  //     return new ZodObject({
  //       ...def,
  //       shape: () => ({
  //         ...def.shape(),
  //         ...augmentation,
  //       }),
  //     }) as any;
  //   };
  extend(augmentation) {
    return new _ZodObject({
      ...this._def,
      shape: () => ({
        ...this._def.shape(),
        ...augmentation
      })
    });
  }
  /**
   * Prior to zod@1.0.12 there was a bug in the
   * inferred type of merged objects. Please
   * upgrade if you are experiencing issues.
   */
  merge(merging) {
    const merged = new _ZodObject({
      unknownKeys: merging._def.unknownKeys,
      catchall: merging._def.catchall,
      shape: () => ({
        ...this._def.shape(),
        ...merging._def.shape()
      }),
      typeName: ZodFirstPartyTypeKind.ZodObject
    });
    return merged;
  }
  // merge<
  //   Incoming extends AnyZodObject,
  //   Augmentation extends Incoming["shape"],
  //   NewOutput extends {
  //     [k in keyof Augmentation | keyof Output]: k extends keyof Augmentation
  //       ? Augmentation[k]["_output"]
  //       : k extends keyof Output
  //       ? Output[k]
  //       : never;
  //   },
  //   NewInput extends {
  //     [k in keyof Augmentation | keyof Input]: k extends keyof Augmentation
  //       ? Augmentation[k]["_input"]
  //       : k extends keyof Input
  //       ? Input[k]
  //       : never;
  //   }
  // >(
  //   merging: Incoming
  // ): ZodObject<
  //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
  //   Incoming["_def"]["unknownKeys"],
  //   Incoming["_def"]["catchall"],
  //   NewOutput,
  //   NewInput
  // > {
  //   const merged: any = new ZodObject({
  //     unknownKeys: merging._def.unknownKeys,
  //     catchall: merging._def.catchall,
  //     shape: () =>
  //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
  //     typeName: ZodFirstPartyTypeKind.ZodObject,
  //   }) as any;
  //   return merged;
  // }
  setKey(key, schema) {
    return this.augment({ [key]: schema });
  }
  // merge<Incoming extends AnyZodObject>(
  //   merging: Incoming
  // ): //ZodObject<T & Incoming["_shape"], UnknownKeys, Catchall> = (merging) => {
  // ZodObject<
  //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
  //   Incoming["_def"]["unknownKeys"],
  //   Incoming["_def"]["catchall"]
  // > {
  //   // const mergedShape = objectUtil.mergeShapes(
  //   //   this._def.shape(),
  //   //   merging._def.shape()
  //   // );
  //   const merged: any = new ZodObject({
  //     unknownKeys: merging._def.unknownKeys,
  //     catchall: merging._def.catchall,
  //     shape: () =>
  //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
  //     typeName: ZodFirstPartyTypeKind.ZodObject,
  //   }) as any;
  //   return merged;
  // }
  catchall(index) {
    return new _ZodObject({
      ...this._def,
      catchall: index
    });
  }
  pick(mask) {
    const shape = {};
    for (const key of util.objectKeys(mask)) {
      if (mask[key] && this.shape[key]) {
        shape[key] = this.shape[key];
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => shape
    });
  }
  omit(mask) {
    const shape = {};
    for (const key of util.objectKeys(this.shape)) {
      if (!mask[key]) {
        shape[key] = this.shape[key];
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => shape
    });
  }
  /**
   * @deprecated
   */
  deepPartial() {
    return deepPartialify(this);
  }
  partial(mask) {
    const newShape = {};
    for (const key of util.objectKeys(this.shape)) {
      const fieldSchema = this.shape[key];
      if (mask && !mask[key]) {
        newShape[key] = fieldSchema;
      } else {
        newShape[key] = fieldSchema.optional();
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => newShape
    });
  }
  required(mask) {
    const newShape = {};
    for (const key of util.objectKeys(this.shape)) {
      if (mask && !mask[key]) {
        newShape[key] = this.shape[key];
      } else {
        const fieldSchema = this.shape[key];
        let newField = fieldSchema;
        while (newField instanceof ZodOptional) {
          newField = newField._def.innerType;
        }
        newShape[key] = newField;
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => newShape
    });
  }
  keyof() {
    return createZodEnum(util.objectKeys(this.shape));
  }
};
ZodObject.create = (shape, params) => {
  return new ZodObject({
    shape: () => shape,
    unknownKeys: "strip",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
ZodObject.strictCreate = (shape, params) => {
  return new ZodObject({
    shape: () => shape,
    unknownKeys: "strict",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
ZodObject.lazycreate = (shape, params) => {
  return new ZodObject({
    shape,
    unknownKeys: "strip",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
var ZodUnion = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const options = this._def.options;
    function handleResults(results) {
      for (const result of results) {
        if (result.result.status === "valid") {
          return result.result;
        }
      }
      for (const result of results) {
        if (result.result.status === "dirty") {
          ctx.common.issues.push(...result.ctx.common.issues);
          return result.result;
        }
      }
      const unionErrors = results.map((result) => new ZodError(result.ctx.common.issues));
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union,
        unionErrors
      });
      return INVALID;
    }
    if (ctx.common.async) {
      return Promise.all(options.map(async (option) => {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        return {
          result: await option._parseAsync({
            data: ctx.data,
            path: ctx.path,
            parent: childCtx
          }),
          ctx: childCtx
        };
      })).then(handleResults);
    } else {
      let dirty = void 0;
      const issues = [];
      for (const option of options) {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        const result = option._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: childCtx
        });
        if (result.status === "valid") {
          return result;
        } else if (result.status === "dirty" && !dirty) {
          dirty = { result, ctx: childCtx };
        }
        if (childCtx.common.issues.length) {
          issues.push(childCtx.common.issues);
        }
      }
      if (dirty) {
        ctx.common.issues.push(...dirty.ctx.common.issues);
        return dirty.result;
      }
      const unionErrors = issues.map((issues2) => new ZodError(issues2));
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union,
        unionErrors
      });
      return INVALID;
    }
  }
  get options() {
    return this._def.options;
  }
};
ZodUnion.create = (types, params) => {
  return new ZodUnion({
    options: types,
    typeName: ZodFirstPartyTypeKind.ZodUnion,
    ...processCreateParams(params)
  });
};
var getDiscriminator = (type) => {
  if (type instanceof ZodLazy) {
    return getDiscriminator(type.schema);
  } else if (type instanceof ZodEffects) {
    return getDiscriminator(type.innerType());
  } else if (type instanceof ZodLiteral) {
    return [type.value];
  } else if (type instanceof ZodEnum) {
    return type.options;
  } else if (type instanceof ZodNativeEnum) {
    return util.objectValues(type.enum);
  } else if (type instanceof ZodDefault) {
    return getDiscriminator(type._def.innerType);
  } else if (type instanceof ZodUndefined) {
    return [void 0];
  } else if (type instanceof ZodNull) {
    return [null];
  } else if (type instanceof ZodOptional) {
    return [void 0, ...getDiscriminator(type.unwrap())];
  } else if (type instanceof ZodNullable) {
    return [null, ...getDiscriminator(type.unwrap())];
  } else if (type instanceof ZodBranded) {
    return getDiscriminator(type.unwrap());
  } else if (type instanceof ZodReadonly) {
    return getDiscriminator(type.unwrap());
  } else if (type instanceof ZodCatch) {
    return getDiscriminator(type._def.innerType);
  } else {
    return [];
  }
};
var ZodDiscriminatedUnion = class _ZodDiscriminatedUnion extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.object) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const discriminator = this.discriminator;
    const discriminatorValue = ctx.data[discriminator];
    const option = this.optionsMap.get(discriminatorValue);
    if (!option) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union_discriminator,
        options: Array.from(this.optionsMap.keys()),
        path: [discriminator]
      });
      return INVALID;
    }
    if (ctx.common.async) {
      return option._parseAsync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
    } else {
      return option._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
    }
  }
  get discriminator() {
    return this._def.discriminator;
  }
  get options() {
    return this._def.options;
  }
  get optionsMap() {
    return this._def.optionsMap;
  }
  /**
   * The constructor of the discriminated union schema. Its behaviour is very similar to that of the normal z.union() constructor.
   * However, it only allows a union of objects, all of which need to share a discriminator property. This property must
   * have a different value for each object in the union.
   * @param discriminator the name of the discriminator property
   * @param types an array of object schemas
   * @param params
   */
  static create(discriminator, options, params) {
    const optionsMap = /* @__PURE__ */ new Map();
    for (const type of options) {
      const discriminatorValues = getDiscriminator(type.shape[discriminator]);
      if (!discriminatorValues.length) {
        throw new Error(`A discriminator value for key \`${discriminator}\` could not be extracted from all schema options`);
      }
      for (const value of discriminatorValues) {
        if (optionsMap.has(value)) {
          throw new Error(`Discriminator property ${String(discriminator)} has duplicate value ${String(value)}`);
        }
        optionsMap.set(value, type);
      }
    }
    return new _ZodDiscriminatedUnion({
      typeName: ZodFirstPartyTypeKind.ZodDiscriminatedUnion,
      discriminator,
      options,
      optionsMap,
      ...processCreateParams(params)
    });
  }
};
function mergeValues(a, b) {
  const aType = getParsedType(a);
  const bType = getParsedType(b);
  if (a === b) {
    return { valid: true, data: a };
  } else if (aType === ZodParsedType.object && bType === ZodParsedType.object) {
    const bKeys = util.objectKeys(b);
    const sharedKeys = util.objectKeys(a).filter((key) => bKeys.indexOf(key) !== -1);
    const newObj = { ...a, ...b };
    for (const key of sharedKeys) {
      const sharedValue = mergeValues(a[key], b[key]);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newObj[key] = sharedValue.data;
    }
    return { valid: true, data: newObj };
  } else if (aType === ZodParsedType.array && bType === ZodParsedType.array) {
    if (a.length !== b.length) {
      return { valid: false };
    }
    const newArray = [];
    for (let index = 0; index < a.length; index++) {
      const itemA = a[index];
      const itemB = b[index];
      const sharedValue = mergeValues(itemA, itemB);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newArray.push(sharedValue.data);
    }
    return { valid: true, data: newArray };
  } else if (aType === ZodParsedType.date && bType === ZodParsedType.date && +a === +b) {
    return { valid: true, data: a };
  } else {
    return { valid: false };
  }
}
var ZodIntersection = class extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    const handleParsed = (parsedLeft, parsedRight) => {
      if (isAborted(parsedLeft) || isAborted(parsedRight)) {
        return INVALID;
      }
      const merged = mergeValues(parsedLeft.value, parsedRight.value);
      if (!merged.valid) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_intersection_types
        });
        return INVALID;
      }
      if (isDirty(parsedLeft) || isDirty(parsedRight)) {
        status.dirty();
      }
      return { status: status.value, value: merged.data };
    };
    if (ctx.common.async) {
      return Promise.all([
        this._def.left._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        }),
        this._def.right._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        })
      ]).then(([left, right]) => handleParsed(left, right));
    } else {
      return handleParsed(this._def.left._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }), this._def.right._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }));
    }
  }
};
ZodIntersection.create = (left, right, params) => {
  return new ZodIntersection({
    left,
    right,
    typeName: ZodFirstPartyTypeKind.ZodIntersection,
    ...processCreateParams(params)
  });
};
var ZodTuple = class _ZodTuple extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.array) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType
      });
      return INVALID;
    }
    if (ctx.data.length < this._def.items.length) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.too_small,
        minimum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array"
      });
      return INVALID;
    }
    const rest = this._def.rest;
    if (!rest && ctx.data.length > this._def.items.length) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.too_big,
        maximum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array"
      });
      status.dirty();
    }
    const items = [...ctx.data].map((item, itemIndex) => {
      const schema = this._def.items[itemIndex] || this._def.rest;
      if (!schema)
        return null;
      return schema._parse(new ParseInputLazyPath(ctx, item, ctx.path, itemIndex));
    }).filter((x) => !!x);
    if (ctx.common.async) {
      return Promise.all(items).then((results) => {
        return ParseStatus.mergeArray(status, results);
      });
    } else {
      return ParseStatus.mergeArray(status, items);
    }
  }
  get items() {
    return this._def.items;
  }
  rest(rest) {
    return new _ZodTuple({
      ...this._def,
      rest
    });
  }
};
ZodTuple.create = (schemas, params) => {
  if (!Array.isArray(schemas)) {
    throw new Error("You must pass an array of schemas to z.tuple([ ... ])");
  }
  return new ZodTuple({
    items: schemas,
    typeName: ZodFirstPartyTypeKind.ZodTuple,
    rest: null,
    ...processCreateParams(params)
  });
};
var ZodRecord = class _ZodRecord extends ZodType {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.object) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const pairs = [];
    const keyType = this._def.keyType;
    const valueType = this._def.valueType;
    for (const key in ctx.data) {
      pairs.push({
        key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, key)),
        value: valueType._parse(new ParseInputLazyPath(ctx, ctx.data[key], ctx.path, key)),
        alwaysSet: key in ctx.data
      });
    }
    if (ctx.common.async) {
      return ParseStatus.mergeObjectAsync(status, pairs);
    } else {
      return ParseStatus.mergeObjectSync(status, pairs);
    }
  }
  get element() {
    return this._def.valueType;
  }
  static create(first, second, third) {
    if (second instanceof ZodType) {
      return new _ZodRecord({
        keyType: first,
        valueType: second,
        typeName: ZodFirstPartyTypeKind.ZodRecord,
        ...processCreateParams(third)
      });
    }
    return new _ZodRecord({
      keyType: ZodString.create(),
      valueType: first,
      typeName: ZodFirstPartyTypeKind.ZodRecord,
      ...processCreateParams(second)
    });
  }
};
var ZodMap = class extends ZodType {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.map) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.map,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const keyType = this._def.keyType;
    const valueType = this._def.valueType;
    const pairs = [...ctx.data.entries()].map(([key, value], index) => {
      return {
        key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, [index, "key"])),
        value: valueType._parse(new ParseInputLazyPath(ctx, value, ctx.path, [index, "value"]))
      };
    });
    if (ctx.common.async) {
      const finalMap = /* @__PURE__ */ new Map();
      return Promise.resolve().then(async () => {
        for (const pair of pairs) {
          const key = await pair.key;
          const value = await pair.value;
          if (key.status === "aborted" || value.status === "aborted") {
            return INVALID;
          }
          if (key.status === "dirty" || value.status === "dirty") {
            status.dirty();
          }
          finalMap.set(key.value, value.value);
        }
        return { status: status.value, value: finalMap };
      });
    } else {
      const finalMap = /* @__PURE__ */ new Map();
      for (const pair of pairs) {
        const key = pair.key;
        const value = pair.value;
        if (key.status === "aborted" || value.status === "aborted") {
          return INVALID;
        }
        if (key.status === "dirty" || value.status === "dirty") {
          status.dirty();
        }
        finalMap.set(key.value, value.value);
      }
      return { status: status.value, value: finalMap };
    }
  }
};
ZodMap.create = (keyType, valueType, params) => {
  return new ZodMap({
    valueType,
    keyType,
    typeName: ZodFirstPartyTypeKind.ZodMap,
    ...processCreateParams(params)
  });
};
var ZodSet = class _ZodSet extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.set) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.set,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const def = this._def;
    if (def.minSize !== null) {
      if (ctx.data.size < def.minSize.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: def.minSize.value,
          type: "set",
          inclusive: true,
          exact: false,
          message: def.minSize.message
        });
        status.dirty();
      }
    }
    if (def.maxSize !== null) {
      if (ctx.data.size > def.maxSize.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: def.maxSize.value,
          type: "set",
          inclusive: true,
          exact: false,
          message: def.maxSize.message
        });
        status.dirty();
      }
    }
    const valueType = this._def.valueType;
    function finalizeSet(elements2) {
      const parsedSet = /* @__PURE__ */ new Set();
      for (const element of elements2) {
        if (element.status === "aborted")
          return INVALID;
        if (element.status === "dirty")
          status.dirty();
        parsedSet.add(element.value);
      }
      return { status: status.value, value: parsedSet };
    }
    const elements = [...ctx.data.values()].map((item, i) => valueType._parse(new ParseInputLazyPath(ctx, item, ctx.path, i)));
    if (ctx.common.async) {
      return Promise.all(elements).then((elements2) => finalizeSet(elements2));
    } else {
      return finalizeSet(elements);
    }
  }
  min(minSize, message) {
    return new _ZodSet({
      ...this._def,
      minSize: { value: minSize, message: errorUtil.toString(message) }
    });
  }
  max(maxSize, message) {
    return new _ZodSet({
      ...this._def,
      maxSize: { value: maxSize, message: errorUtil.toString(message) }
    });
  }
  size(size, message) {
    return this.min(size, message).max(size, message);
  }
  nonempty(message) {
    return this.min(1, message);
  }
};
ZodSet.create = (valueType, params) => {
  return new ZodSet({
    valueType,
    minSize: null,
    maxSize: null,
    typeName: ZodFirstPartyTypeKind.ZodSet,
    ...processCreateParams(params)
  });
};
var ZodFunction = class _ZodFunction extends ZodType {
  constructor() {
    super(...arguments);
    this.validate = this.implement;
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.function) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.function,
        received: ctx.parsedType
      });
      return INVALID;
    }
    function makeArgsIssue(args, error) {
      return makeIssue({
        data: args,
        path: ctx.path,
        errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), en_default].filter((x) => !!x),
        issueData: {
          code: ZodIssueCode.invalid_arguments,
          argumentsError: error
        }
      });
    }
    function makeReturnsIssue(returns, error) {
      return makeIssue({
        data: returns,
        path: ctx.path,
        errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), en_default].filter((x) => !!x),
        issueData: {
          code: ZodIssueCode.invalid_return_type,
          returnTypeError: error
        }
      });
    }
    const params = { errorMap: ctx.common.contextualErrorMap };
    const fn = ctx.data;
    if (this._def.returns instanceof ZodPromise) {
      const me = this;
      return OK(async function(...args) {
        const error = new ZodError([]);
        const parsedArgs = await me._def.args.parseAsync(args, params).catch((e) => {
          error.addIssue(makeArgsIssue(args, e));
          throw error;
        });
        const result = await Reflect.apply(fn, this, parsedArgs);
        const parsedReturns = await me._def.returns._def.type.parseAsync(result, params).catch((e) => {
          error.addIssue(makeReturnsIssue(result, e));
          throw error;
        });
        return parsedReturns;
      });
    } else {
      const me = this;
      return OK(function(...args) {
        const parsedArgs = me._def.args.safeParse(args, params);
        if (!parsedArgs.success) {
          throw new ZodError([makeArgsIssue(args, parsedArgs.error)]);
        }
        const result = Reflect.apply(fn, this, parsedArgs.data);
        const parsedReturns = me._def.returns.safeParse(result, params);
        if (!parsedReturns.success) {
          throw new ZodError([makeReturnsIssue(result, parsedReturns.error)]);
        }
        return parsedReturns.data;
      });
    }
  }
  parameters() {
    return this._def.args;
  }
  returnType() {
    return this._def.returns;
  }
  args(...items) {
    return new _ZodFunction({
      ...this._def,
      args: ZodTuple.create(items).rest(ZodUnknown.create())
    });
  }
  returns(returnType) {
    return new _ZodFunction({
      ...this._def,
      returns: returnType
    });
  }
  implement(func) {
    const validatedFunc = this.parse(func);
    return validatedFunc;
  }
  strictImplement(func) {
    const validatedFunc = this.parse(func);
    return validatedFunc;
  }
  static create(args, returns, params) {
    return new _ZodFunction({
      args: args ? args : ZodTuple.create([]).rest(ZodUnknown.create()),
      returns: returns || ZodUnknown.create(),
      typeName: ZodFirstPartyTypeKind.ZodFunction,
      ...processCreateParams(params)
    });
  }
};
var ZodLazy = class extends ZodType {
  get schema() {
    return this._def.getter();
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const lazySchema = this._def.getter();
    return lazySchema._parse({ data: ctx.data, path: ctx.path, parent: ctx });
  }
};
ZodLazy.create = (getter, params) => {
  return new ZodLazy({
    getter,
    typeName: ZodFirstPartyTypeKind.ZodLazy,
    ...processCreateParams(params)
  });
};
var ZodLiteral = class extends ZodType {
  _parse(input) {
    if (input.data !== this._def.value) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_literal,
        expected: this._def.value
      });
      return INVALID;
    }
    return { status: "valid", value: input.data };
  }
  get value() {
    return this._def.value;
  }
};
ZodLiteral.create = (value, params) => {
  return new ZodLiteral({
    value,
    typeName: ZodFirstPartyTypeKind.ZodLiteral,
    ...processCreateParams(params)
  });
};
function createZodEnum(values, params) {
  return new ZodEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodEnum,
    ...processCreateParams(params)
  });
}
var ZodEnum = class _ZodEnum extends ZodType {
  _parse(input) {
    if (typeof input.data !== "string") {
      const ctx = this._getOrReturnCtx(input);
      const expectedValues = this._def.values;
      addIssueToContext(ctx, {
        expected: util.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode.invalid_type
      });
      return INVALID;
    }
    if (!this._cache) {
      this._cache = new Set(this._def.values);
    }
    if (!this._cache.has(input.data)) {
      const ctx = this._getOrReturnCtx(input);
      const expectedValues = this._def.values;
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_enum_value,
        options: expectedValues
      });
      return INVALID;
    }
    return OK(input.data);
  }
  get options() {
    return this._def.values;
  }
  get enum() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  get Values() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  get Enum() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  extract(values, newDef = this._def) {
    return _ZodEnum.create(values, {
      ...this._def,
      ...newDef
    });
  }
  exclude(values, newDef = this._def) {
    return _ZodEnum.create(this.options.filter((opt) => !values.includes(opt)), {
      ...this._def,
      ...newDef
    });
  }
};
ZodEnum.create = createZodEnum;
var ZodNativeEnum = class extends ZodType {
  _parse(input) {
    const nativeEnumValues = util.getValidEnumValues(this._def.values);
    const ctx = this._getOrReturnCtx(input);
    if (ctx.parsedType !== ZodParsedType.string && ctx.parsedType !== ZodParsedType.number) {
      const expectedValues = util.objectValues(nativeEnumValues);
      addIssueToContext(ctx, {
        expected: util.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode.invalid_type
      });
      return INVALID;
    }
    if (!this._cache) {
      this._cache = new Set(util.getValidEnumValues(this._def.values));
    }
    if (!this._cache.has(input.data)) {
      const expectedValues = util.objectValues(nativeEnumValues);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_enum_value,
        options: expectedValues
      });
      return INVALID;
    }
    return OK(input.data);
  }
  get enum() {
    return this._def.values;
  }
};
ZodNativeEnum.create = (values, params) => {
  return new ZodNativeEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodNativeEnum,
    ...processCreateParams(params)
  });
};
var ZodPromise = class extends ZodType {
  unwrap() {
    return this._def.type;
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.promise && ctx.common.async === false) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.promise,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const promisified = ctx.parsedType === ZodParsedType.promise ? ctx.data : Promise.resolve(ctx.data);
    return OK(promisified.then((data) => {
      return this._def.type.parseAsync(data, {
        path: ctx.path,
        errorMap: ctx.common.contextualErrorMap
      });
    }));
  }
};
ZodPromise.create = (schema, params) => {
  return new ZodPromise({
    type: schema,
    typeName: ZodFirstPartyTypeKind.ZodPromise,
    ...processCreateParams(params)
  });
};
var ZodEffects = class extends ZodType {
  innerType() {
    return this._def.schema;
  }
  sourceType() {
    return this._def.schema._def.typeName === ZodFirstPartyTypeKind.ZodEffects ? this._def.schema.sourceType() : this._def.schema;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    const effect = this._def.effect || null;
    const checkCtx = {
      addIssue: (arg) => {
        addIssueToContext(ctx, arg);
        if (arg.fatal) {
          status.abort();
        } else {
          status.dirty();
        }
      },
      get path() {
        return ctx.path;
      }
    };
    checkCtx.addIssue = checkCtx.addIssue.bind(checkCtx);
    if (effect.type === "preprocess") {
      const processed = effect.transform(ctx.data, checkCtx);
      if (ctx.common.async) {
        return Promise.resolve(processed).then(async (processed2) => {
          if (status.value === "aborted")
            return INVALID;
          const result = await this._def.schema._parseAsync({
            data: processed2,
            path: ctx.path,
            parent: ctx
          });
          if (result.status === "aborted")
            return INVALID;
          if (result.status === "dirty")
            return DIRTY(result.value);
          if (status.value === "dirty")
            return DIRTY(result.value);
          return result;
        });
      } else {
        if (status.value === "aborted")
          return INVALID;
        const result = this._def.schema._parseSync({
          data: processed,
          path: ctx.path,
          parent: ctx
        });
        if (result.status === "aborted")
          return INVALID;
        if (result.status === "dirty")
          return DIRTY(result.value);
        if (status.value === "dirty")
          return DIRTY(result.value);
        return result;
      }
    }
    if (effect.type === "refinement") {
      const executeRefinement = (acc) => {
        const result = effect.refinement(acc, checkCtx);
        if (ctx.common.async) {
          return Promise.resolve(result);
        }
        if (result instanceof Promise) {
          throw new Error("Async refinement encountered during synchronous parse operation. Use .parseAsync instead.");
        }
        return acc;
      };
      if (ctx.common.async === false) {
        const inner = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inner.status === "aborted")
          return INVALID;
        if (inner.status === "dirty")
          status.dirty();
        executeRefinement(inner.value);
        return { status: status.value, value: inner.value };
      } else {
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((inner) => {
          if (inner.status === "aborted")
            return INVALID;
          if (inner.status === "dirty")
            status.dirty();
          return executeRefinement(inner.value).then(() => {
            return { status: status.value, value: inner.value };
          });
        });
      }
    }
    if (effect.type === "transform") {
      if (ctx.common.async === false) {
        const base = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (!isValid(base))
          return INVALID;
        const result = effect.transform(base.value, checkCtx);
        if (result instanceof Promise) {
          throw new Error(`Asynchronous transform encountered during synchronous parse operation. Use .parseAsync instead.`);
        }
        return { status: status.value, value: result };
      } else {
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((base) => {
          if (!isValid(base))
            return INVALID;
          return Promise.resolve(effect.transform(base.value, checkCtx)).then((result) => ({
            status: status.value,
            value: result
          }));
        });
      }
    }
    util.assertNever(effect);
  }
};
ZodEffects.create = (schema, effect, params) => {
  return new ZodEffects({
    schema,
    typeName: ZodFirstPartyTypeKind.ZodEffects,
    effect,
    ...processCreateParams(params)
  });
};
ZodEffects.createWithPreprocess = (preprocess, schema, params) => {
  return new ZodEffects({
    schema,
    effect: { type: "preprocess", transform: preprocess },
    typeName: ZodFirstPartyTypeKind.ZodEffects,
    ...processCreateParams(params)
  });
};
var ZodOptional = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType === ZodParsedType.undefined) {
      return OK(void 0);
    }
    return this._def.innerType._parse(input);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodOptional.create = (type, params) => {
  return new ZodOptional({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodOptional,
    ...processCreateParams(params)
  });
};
var ZodNullable = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType === ZodParsedType.null) {
      return OK(null);
    }
    return this._def.innerType._parse(input);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodNullable.create = (type, params) => {
  return new ZodNullable({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodNullable,
    ...processCreateParams(params)
  });
};
var ZodDefault = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    let data = ctx.data;
    if (ctx.parsedType === ZodParsedType.undefined) {
      data = this._def.defaultValue();
    }
    return this._def.innerType._parse({
      data,
      path: ctx.path,
      parent: ctx
    });
  }
  removeDefault() {
    return this._def.innerType;
  }
};
ZodDefault.create = (type, params) => {
  return new ZodDefault({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodDefault,
    defaultValue: typeof params.default === "function" ? params.default : () => params.default,
    ...processCreateParams(params)
  });
};
var ZodCatch = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const newCtx = {
      ...ctx,
      common: {
        ...ctx.common,
        issues: []
      }
    };
    const result = this._def.innerType._parse({
      data: newCtx.data,
      path: newCtx.path,
      parent: {
        ...newCtx
      }
    });
    if (isAsync(result)) {
      return result.then((result2) => {
        return {
          status: "valid",
          value: result2.status === "valid" ? result2.value : this._def.catchValue({
            get error() {
              return new ZodError(newCtx.common.issues);
            },
            input: newCtx.data
          })
        };
      });
    } else {
      return {
        status: "valid",
        value: result.status === "valid" ? result.value : this._def.catchValue({
          get error() {
            return new ZodError(newCtx.common.issues);
          },
          input: newCtx.data
        })
      };
    }
  }
  removeCatch() {
    return this._def.innerType;
  }
};
ZodCatch.create = (type, params) => {
  return new ZodCatch({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodCatch,
    catchValue: typeof params.catch === "function" ? params.catch : () => params.catch,
    ...processCreateParams(params)
  });
};
var ZodNaN = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.nan) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.nan,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return { status: "valid", value: input.data };
  }
};
ZodNaN.create = (params) => {
  return new ZodNaN({
    typeName: ZodFirstPartyTypeKind.ZodNaN,
    ...processCreateParams(params)
  });
};
var BRAND = /* @__PURE__ */ Symbol("zod_brand");
var ZodBranded = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const data = ctx.data;
    return this._def.type._parse({
      data,
      path: ctx.path,
      parent: ctx
    });
  }
  unwrap() {
    return this._def.type;
  }
};
var ZodPipeline = class _ZodPipeline extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.common.async) {
      const handleAsync = async () => {
        const inResult = await this._def.in._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inResult.status === "aborted")
          return INVALID;
        if (inResult.status === "dirty") {
          status.dirty();
          return DIRTY(inResult.value);
        } else {
          return this._def.out._parseAsync({
            data: inResult.value,
            path: ctx.path,
            parent: ctx
          });
        }
      };
      return handleAsync();
    } else {
      const inResult = this._def.in._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
      if (inResult.status === "aborted")
        return INVALID;
      if (inResult.status === "dirty") {
        status.dirty();
        return {
          status: "dirty",
          value: inResult.value
        };
      } else {
        return this._def.out._parseSync({
          data: inResult.value,
          path: ctx.path,
          parent: ctx
        });
      }
    }
  }
  static create(a, b) {
    return new _ZodPipeline({
      in: a,
      out: b,
      typeName: ZodFirstPartyTypeKind.ZodPipeline
    });
  }
};
var ZodReadonly = class extends ZodType {
  _parse(input) {
    const result = this._def.innerType._parse(input);
    const freeze = (data) => {
      if (isValid(data)) {
        data.value = Object.freeze(data.value);
      }
      return data;
    };
    return isAsync(result) ? result.then((data) => freeze(data)) : freeze(result);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodReadonly.create = (type, params) => {
  return new ZodReadonly({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodReadonly,
    ...processCreateParams(params)
  });
};
function cleanParams(params, data) {
  const p = typeof params === "function" ? params(data) : typeof params === "string" ? { message: params } : params;
  const p2 = typeof p === "string" ? { message: p } : p;
  return p2;
}
function custom(check, _params = {}, fatal) {
  if (check)
    return ZodAny.create().superRefine((data, ctx) => {
      const r = check(data);
      if (r instanceof Promise) {
        return r.then((r2) => {
          if (!r2) {
            const params = cleanParams(_params, data);
            const _fatal = params.fatal ?? fatal ?? true;
            ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
          }
        });
      }
      if (!r) {
        const params = cleanParams(_params, data);
        const _fatal = params.fatal ?? fatal ?? true;
        ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
      }
      return;
    });
  return ZodAny.create();
}
var late = {
  object: ZodObject.lazycreate
};
var ZodFirstPartyTypeKind;
(function(ZodFirstPartyTypeKind2) {
  ZodFirstPartyTypeKind2["ZodString"] = "ZodString";
  ZodFirstPartyTypeKind2["ZodNumber"] = "ZodNumber";
  ZodFirstPartyTypeKind2["ZodNaN"] = "ZodNaN";
  ZodFirstPartyTypeKind2["ZodBigInt"] = "ZodBigInt";
  ZodFirstPartyTypeKind2["ZodBoolean"] = "ZodBoolean";
  ZodFirstPartyTypeKind2["ZodDate"] = "ZodDate";
  ZodFirstPartyTypeKind2["ZodSymbol"] = "ZodSymbol";
  ZodFirstPartyTypeKind2["ZodUndefined"] = "ZodUndefined";
  ZodFirstPartyTypeKind2["ZodNull"] = "ZodNull";
  ZodFirstPartyTypeKind2["ZodAny"] = "ZodAny";
  ZodFirstPartyTypeKind2["ZodUnknown"] = "ZodUnknown";
  ZodFirstPartyTypeKind2["ZodNever"] = "ZodNever";
  ZodFirstPartyTypeKind2["ZodVoid"] = "ZodVoid";
  ZodFirstPartyTypeKind2["ZodArray"] = "ZodArray";
  ZodFirstPartyTypeKind2["ZodObject"] = "ZodObject";
  ZodFirstPartyTypeKind2["ZodUnion"] = "ZodUnion";
  ZodFirstPartyTypeKind2["ZodDiscriminatedUnion"] = "ZodDiscriminatedUnion";
  ZodFirstPartyTypeKind2["ZodIntersection"] = "ZodIntersection";
  ZodFirstPartyTypeKind2["ZodTuple"] = "ZodTuple";
  ZodFirstPartyTypeKind2["ZodRecord"] = "ZodRecord";
  ZodFirstPartyTypeKind2["ZodMap"] = "ZodMap";
  ZodFirstPartyTypeKind2["ZodSet"] = "ZodSet";
  ZodFirstPartyTypeKind2["ZodFunction"] = "ZodFunction";
  ZodFirstPartyTypeKind2["ZodLazy"] = "ZodLazy";
  ZodFirstPartyTypeKind2["ZodLiteral"] = "ZodLiteral";
  ZodFirstPartyTypeKind2["ZodEnum"] = "ZodEnum";
  ZodFirstPartyTypeKind2["ZodEffects"] = "ZodEffects";
  ZodFirstPartyTypeKind2["ZodNativeEnum"] = "ZodNativeEnum";
  ZodFirstPartyTypeKind2["ZodOptional"] = "ZodOptional";
  ZodFirstPartyTypeKind2["ZodNullable"] = "ZodNullable";
  ZodFirstPartyTypeKind2["ZodDefault"] = "ZodDefault";
  ZodFirstPartyTypeKind2["ZodCatch"] = "ZodCatch";
  ZodFirstPartyTypeKind2["ZodPromise"] = "ZodPromise";
  ZodFirstPartyTypeKind2["ZodBranded"] = "ZodBranded";
  ZodFirstPartyTypeKind2["ZodPipeline"] = "ZodPipeline";
  ZodFirstPartyTypeKind2["ZodReadonly"] = "ZodReadonly";
})(ZodFirstPartyTypeKind || (ZodFirstPartyTypeKind = {}));
var instanceOfType = (cls, params = {
  message: `Input not instance of ${cls.name}`
}) => custom((data) => data instanceof cls, params);
var stringType = ZodString.create;
var numberType = ZodNumber.create;
var nanType = ZodNaN.create;
var bigIntType = ZodBigInt.create;
var booleanType = ZodBoolean.create;
var dateType = ZodDate.create;
var symbolType = ZodSymbol.create;
var undefinedType = ZodUndefined.create;
var nullType = ZodNull.create;
var anyType = ZodAny.create;
var unknownType = ZodUnknown.create;
var neverType = ZodNever.create;
var voidType = ZodVoid.create;
var arrayType = ZodArray.create;
var objectType = ZodObject.create;
var strictObjectType = ZodObject.strictCreate;
var unionType = ZodUnion.create;
var discriminatedUnionType = ZodDiscriminatedUnion.create;
var intersectionType = ZodIntersection.create;
var tupleType = ZodTuple.create;
var recordType = ZodRecord.create;
var mapType = ZodMap.create;
var setType = ZodSet.create;
var functionType = ZodFunction.create;
var lazyType = ZodLazy.create;
var literalType = ZodLiteral.create;
var enumType = ZodEnum.create;
var nativeEnumType = ZodNativeEnum.create;
var promiseType = ZodPromise.create;
var effectsType = ZodEffects.create;
var optionalType = ZodOptional.create;
var nullableType = ZodNullable.create;
var preprocessType = ZodEffects.createWithPreprocess;
var pipelineType = ZodPipeline.create;
var ostring = () => stringType().optional();
var onumber = () => numberType().optional();
var oboolean = () => booleanType().optional();
var coerce = {
  string: ((arg) => ZodString.create({ ...arg, coerce: true })),
  number: ((arg) => ZodNumber.create({ ...arg, coerce: true })),
  boolean: ((arg) => ZodBoolean.create({
    ...arg,
    coerce: true
  })),
  bigint: ((arg) => ZodBigInt.create({ ...arg, coerce: true })),
  date: ((arg) => ZodDate.create({ ...arg, coerce: true }))
};
var NEVER = INVALID;

// ../core/dist/domain/result.js
var Ok = (value) => ({ ok: true, value });
var Err = (error) => ({ ok: false, error });

// ../core/dist/domain/ids.js
var CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
var TIME_LEN = 10;
var RANDOM_LEN = 16;
var systemClock = {
  now: () => Date.now(),
  randomBytes: (n) => crypto.getRandomValues(new Uint8Array(n))
};
function encodeTime(now) {
  if (!Number.isInteger(now) || now < 0 || now > 281474976710655) {
    throw new RangeError(`ULID timestamp out of range: ${now}`);
  }
  let out2 = "";
  let t = now;
  for (let i = 0; i < TIME_LEN; i++) {
    out2 = CROCKFORD[t % 32] + out2;
    t = Math.floor(t / 32);
  }
  return out2;
}
function encodeRandom(clock) {
  const bytes = clock.randomBytes(RANDOM_LEN);
  let out2 = "";
  for (let i = 0; i < RANDOM_LEN; i++)
    out2 += CROCKFORD[bytes[i] % 32];
  return out2;
}
function createUlidFactory(clock = systemClock) {
  let lastTime = -1;
  let lastRandom = "";
  return () => {
    const now = clock.now();
    if (now === lastTime) {
      lastRandom = incrementBase32(lastRandom);
    } else {
      lastTime = now;
      lastRandom = encodeRandom(clock);
    }
    return encodeTime(now) + lastRandom;
  };
}
function incrementBase32(s) {
  const chars = [...s];
  for (let i = chars.length - 1; i >= 0; i--) {
    const idx = CROCKFORD.indexOf(chars[i]);
    if (idx < 31) {
      chars[i] = CROCKFORD[idx + 1];
      return chars.join("");
    }
    chars[i] = CROCKFORD[0];
  }
  throw new Error("ULID random component overflowed within a single millisecond");
}

// ../core/dist/domain/commodity.js
var MAX_EXPONENT = 9;
var I64_MIN = -(2n ** 63n);
var I64_MAX = 2n ** 63n - 1n;
var CODE_RE = /^[A-Z][A-Z0-9._]{0,23}$/;
function isCommodityCode(s) {
  return CODE_RE.test(s);
}
function assertCommodityCode(s) {
  if (!isCommodityCode(s)) {
    throw new TypeError(`invalid commodity code: ${JSON.stringify(s)} (want /^[A-Z][A-Z0-9._]{0,23}$/)`);
  }
  return s;
}
var UnknownCommodityError = class extends Error {
  code;
  constructor(code) {
    super(`unknown commodity: ${code}. Register it before use.`);
    this.code = code;
    this.name = "UnknownCommodityError";
  }
};
var CommodityRegistry = class _CommodityRegistry {
  #byCode = /* @__PURE__ */ new Map();
  static from(commodities) {
    const r = new _CommodityRegistry();
    for (const c of commodities)
      r.register(c);
    return r;
  }
  register(c) {
    assertCommodityCode(c.code);
    if (!Number.isInteger(c.exponent) || c.exponent < 0 || c.exponent > MAX_EXPONENT) {
      throw new RangeError(`commodity ${c.code}: exponent must be an integer in [0, ${MAX_EXPONENT}], got ${c.exponent}`);
    }
    const existing = this.#byCode.get(c.code);
    if (existing && existing.exponent !== c.exponent) {
      throw new Error(`commodity ${c.code}: exponent is immutable once registered (${existing.exponent} \u2192 ${c.exponent}). Changing it requires rewriting every amount in the journal.`);
    }
    this.#byCode.set(c.code, c);
  }
  get(code) {
    const c = this.#byCode.get(code);
    if (!c)
      throw new UnknownCommodityError(code);
    return c;
  }
  has(code) {
    return this.#byCode.has(code);
  }
  exponentOf(code) {
    return this.get(code).exponent;
  }
  /** Sorted by code so any derived output is deterministic. */
  all() {
    return [...this.#byCode.values()].sort((a, b) => a.code < b.code ? -1 : a.code > b.code ? 1 : 0);
  }
};
var WELL_KNOWN_COMMODITIES = [
  { code: "KRW", exponent: 0, kind: "fiat", name: "South Korean Won" },
  { code: "USD", exponent: 2, kind: "fiat", name: "US Dollar" },
  { code: "EUR", exponent: 2, kind: "fiat", name: "Euro" },
  { code: "JPY", exponent: 0, kind: "fiat", name: "Japanese Yen" },
  { code: "GBP", exponent: 2, kind: "fiat", name: "Pound Sterling" },
  { code: "CNY", exponent: 2, kind: "fiat", name: "Chinese Yuan" },
  { code: "BTC", exponent: 8, kind: "crypto", name: "Bitcoin" },
  // Deliberately 8, not 18. See MAX_EXPONENT above.
  { code: "ETH", exponent: 8, kind: "crypto", name: "Ether (truncated to 8dp)" }
];

// ../core/dist/domain/amount.js
var AmountScaleError = class extends Error {
  text;
  commodity;
  exponent;
  given;
  constructor(text, commodity, exponent, given) {
    super(`${JSON.stringify(text)} has ${given} decimal place(s) but ${commodity} has exponent ${exponent}. ` + (exponent === 0 ? `${commodity} has no minor unit \u2014 write it as a whole number.` : `At most ${exponent} decimal place(s) are representable.`));
    this.text = text;
    this.commodity = commodity;
    this.exponent = exponent;
    this.given = given;
    this.name = "AmountScaleError";
  }
};
var AmountRangeError = class extends Error {
  minor;
  constructor(minor) {
    super(`amount ${minor} is outside the representable i64 range [${I64_MIN}, ${I64_MAX}]`);
    this.minor = minor;
    this.name = "AmountRangeError";
  }
};
var DECIMAL_RE = /^(-?)(\d+)(?:\.(\d+))?$/;
var AmountFactory = class {
  registry;
  constructor(registry2) {
    this.registry = registry2;
  }
  /**
   * Parse a decimal string. Throws on a scale the commodity cannot represent.
   *
   *   parse("1234.56", "USD")  →  123456n
   *   parse("1234",    "KRW")  →    1234n
   *   parse("1234.5",  "USD")  →  123450n   (fewer decimals than exponent is fine)
   *   parse("1234.56", "KRW")  →  throws    (KRW has no minor unit)
   */
  parse(text, commodityCode) {
    const commodity = this.registry.get(commodityCode);
    const m = DECIMAL_RE.exec(text.trim());
    if (!m) {
      throw new TypeError(`${JSON.stringify(text)} is not a plain decimal number. Expected e.g. "1234", "-1234.56". No exponents, no separators, no currency symbols.`);
    }
    const [, sign, whole, frac = ""] = m;
    if (frac.length > commodity.exponent) {
      throw new AmountScaleError(text, commodityCode, commodity.exponent, frac.length);
    }
    const padded = frac.padEnd(commodity.exponent, "0");
    const minor = BigInt(`${sign}${whole}${padded}`);
    return this.fromMinor(minor, commodityCode);
  }
  /** Build from an already-scaled integer. Range-checked; scale is trusted. */
  fromMinor(minor, commodityCode) {
    const commodity = this.registry.get(commodityCode);
    if (minor < I64_MIN || minor > I64_MAX)
      throw new AmountRangeError(minor);
    return { minor, commodity: commodity.code };
  }
  zero(commodityCode) {
    return this.fromMinor(0n, commodityCode);
  }
  /** Render for humans. Never for the journal — the journal stores minor units. */
  format(a) {
    const exponent = this.registry.exponentOf(a.commodity);
    const neg = a.minor < 0n;
    const digits = (neg ? -a.minor : a.minor).toString().padStart(exponent + 1, "0");
    const cut = digits.length - exponent;
    const body = exponent === 0 ? digits : `${digits.slice(0, cut)}.${digits.slice(cut)}`;
    return `${neg ? "-" : ""}${body}`;
  }
  formatWithCode(a) {
    return `${this.format(a)} ${a.commodity}`;
  }
};
function inI64Range(v) {
  return v >= I64_MIN && v <= I64_MAX;
}

// ../core/dist/domain/account.js
var ROOT_BY_TYPE = {
  asset: "Assets",
  liability: "Liabilities",
  equity: "Equity",
  income: "Income",
  expense: "Expenses"
};
var TYPE_BY_ROOT = Object.freeze(Object.fromEntries(Object.entries(ROOT_BY_TYPE).map(([t, r]) => [r, t])));
var ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
function isIsoDate(s) {
  if (!ISO_DATE_RE.test(s))
    return false;
  const d = /* @__PURE__ */ new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}
function assertIsoDate(s) {
  if (!isIsoDate(s))
    throw new TypeError(`not a valid ISO date (YYYY-MM-DD): ${JSON.stringify(s)}`);
  return s;
}
var SEGMENT_RE = /^[A-Z][A-Za-z0-9-]*$/;
function parseAccountCode(code) {
  const segments = code.split(":");
  if (segments.length < 2) {
    throw new TypeError(`account code must have at least two segments, e.g. "Assets:Cash" \u2014 got ${JSON.stringify(code)}`);
  }
  const [root] = segments;
  const type = TYPE_BY_ROOT[root];
  if (!type) {
    throw new TypeError(`account code must start with one of ${Object.values(ROOT_BY_TYPE).join(", ")} \u2014 got ${JSON.stringify(root)}`);
  }
  for (const s of segments) {
    if (!SEGMENT_RE.test(s)) {
      throw new TypeError(`invalid account code segment ${JSON.stringify(s)} in ${JSON.stringify(code)} \u2014 segments must start with an uppercase letter and contain only letters, digits, and '-'`);
    }
  }
  return { type, segments };
}
function assertAccountCode(code) {
  parseAccountCode(code);
  return code;
}
function assertAccountPrefix(prefix) {
  const segments = prefix.split(":");
  const [root] = segments;
  if (!root || !TYPE_BY_ROOT[root]) {
    throw new TypeError(`an account prefix must start with one of ${Object.values(ROOT_BY_TYPE).join(", ")} \u2014 got ${JSON.stringify(root)}`);
  }
  for (const s of segments) {
    if (!SEGMENT_RE.test(s)) {
      throw new TypeError(`invalid segment ${JSON.stringify(s)} in prefix ${JSON.stringify(prefix)} \u2014 segments must start with an uppercase letter and contain only letters, digits, and '-'`);
    }
  }
  return prefix;
}
function accountTypeOf(code) {
  return parseAccountCode(code).type;
}
function displaySignOf(type) {
  return type === "liability" || type === "equity" || type === "income" ? -1 : 1;
}

// ../core/dist/domain/txn.js
function describeTxnError(e) {
  switch (e.code) {
    case "too_few_postings":
      return `a transaction needs at least 2 postings, got ${e.count}`;
    case "unbalanced":
      return `postings do not balance: they sum to ${e.residualMinor} ${e.bookingCommodity} minor units, and must sum to exactly 0. There is no tolerance in this system by design \u2014 if this is an FX spread, book it explicitly to an Expenses:FX account.`;
    case "weight_required":
      return `posting ${e.seq} is in ${e.commodity}, not the booking commodity, so its weight cannot be inferred and must be supplied explicitly`;
    case "identity_weight_mismatch":
      return `posting ${e.seq} is already in the booking commodity, so its weight must equal its units (units=${e.unitsMinor}, weight=${e.weightMinor})`;
    case "identity_source_mismatch":
      return `posting ${e.seq} is in the booking commodity, so weightSource must be 'identity', got '${e.weightSource}'`;
    case "weight_out_of_range":
      return `posting ${e.seq} weight ${e.weightMinor} is outside the representable i64 range`;
    case "sum_out_of_range":
      return `the sum of posting weights (${e.sumMinor}) overflowed the i64 range`;
    case "plug_not_in_booking_commodity":
      return `posting ${e.seq} is a plug, which must be denominated in the booking commodity, got ${e.commodity}`;
  }
}
var Txn = {
  /**
   * The real gate. Pure, synchronous, I/O-free — property-testable with zero mocks.
   *
   * The balance rule:
   *
   *     SUM(weight_minor) = 0, exactly, in integer arithmetic.
   *
   * Note what is NOT here: a tolerance. Deriving a counter-amount by multiplying
   * a stored rate is lossy at integer scale (₩1,000,000 → $750.00 implies
   * 1333.3333…; multiply back and you get ₩999,998), and the usual fix is to
   * invent a tolerance — which then masks errors at exactly the magnitude worth
   * catching, like a missing ₩50 wire fee. So weights are stored as facts, rates
   * are derived for display, and two i64s summing to zero is exact.
   *
   * Returns every error at once rather than throwing on the first, because the
   * caller is usually rendering a review screen to a human.
   */
  create(input) {
    const errors = [];
    const { bookingCommodity } = input;
    if (input.postings.length < 2) {
      errors.push({ code: "too_few_postings", count: input.postings.length });
    }
    const postings = [];
    let sum = 0n;
    let fxEstimated = false;
    input.postings.forEach((p, i) => {
      const seq = i;
      const isBooking = p.units.commodity === bookingCommodity;
      let weightMinor;
      let weightSource;
      if (isBooking) {
        weightSource = p.weightSource ?? "identity";
        if (p.weightSource !== void 0 && p.weightSource !== "identity" && p.weightSource !== "plug") {
          errors.push({ code: "identity_source_mismatch", seq, weightSource: p.weightSource });
        }
        weightMinor = p.weightMinor ?? p.units.minor;
        if (weightMinor !== p.units.minor) {
          errors.push({ code: "identity_weight_mismatch", seq, unitsMinor: p.units.minor, weightMinor });
        }
      } else {
        if (p.weightSource === "plug") {
          errors.push({ code: "plug_not_in_booking_commodity", seq, commodity: p.units.commodity });
        }
        if (p.weightMinor === void 0) {
          errors.push({ code: "weight_required", seq, commodity: p.units.commodity });
          weightMinor = 0n;
          weightSource = p.weightSource ?? "rate";
        } else {
          weightMinor = p.weightMinor;
          weightSource = p.weightSource ?? "rate";
        }
      }
      if (!inI64Range(weightMinor)) {
        errors.push({ code: "weight_out_of_range", seq, weightMinor });
      }
      sum += weightMinor;
      if (weightSource === "rate")
        fxEstimated = true;
      postings.push({
        seq,
        accountId: p.accountId,
        units: p.units,
        weightMinor,
        weightSource,
        fxRateText: p.fxRateText ?? null,
        fxRateId: p.fxRateId ?? null,
        lotId: p.lotId ?? null,
        kind: p.kind ?? "normal",
        memo: p.memo ?? null
      });
    });
    if (!inI64Range(sum)) {
      errors.push({ code: "sum_out_of_range", sumMinor: sum });
    } else if (sum !== 0n) {
      errors.push({ code: "unbalanced", residualMinor: sum, bookingCommodity });
    }
    if (errors.length > 0)
      return Err(errors);
    const fields = {
      id: input.id,
      date: input.date,
      bookingCommodity,
      payee: input.payee ?? null,
      narration: input.narration ?? "",
      systemKind: input.systemKind ?? null,
      correctsTxnId: input.correctsTxnId ?? null,
      sourceItemId: input.sourceItemId ?? null,
      fxEstimated,
      tags: Object.freeze([...input.tags ?? []].sort()),
      meta: Object.freeze({ ...input.meta ?? {} }),
      postings: Object.freeze(postings)
    };
    return Ok(fields);
  },
  /**
   * Re-attach the brand to a transaction loaded from storage.
   *
   * Adapters need this because rows come back as plain data. It is deliberately
   * named to be conspicuous in review: it asserts the balance rule rather than
   * checking it, and it is only sound because the storage trigger already
   * rejected anything unbalanced on the way in. Never call it on agent input —
   * that is what `create()` is for.
   */
  trustFromStorage(fields) {
    return fields;
  }
};

// ../core/dist/domain/billing.js
var CardCycleRuleError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "CardCycleRuleError";
  }
};
function assertCardCycleRule(r) {
  if (!Number.isInteger(r.cycleCloseDay) || r.cycleCloseDay < 1 || r.cycleCloseDay > 31) {
    throw new CardCycleRuleError(`cycleCloseDay must be an integer in [1, 31], got ${r.cycleCloseDay}`);
  }
  if (!Number.isInteger(r.paymentMonthOffset) || r.paymentMonthOffset < 0 || r.paymentMonthOffset > 3) {
    throw new CardCycleRuleError(`paymentMonthOffset must be an integer in [0, 3], got ${r.paymentMonthOffset}`);
  }
  const okDay = r.paymentDay === -1 || Number.isInteger(r.paymentDay) && r.paymentDay >= 1 && r.paymentDay <= 31;
  if (!okDay) {
    throw new CardCycleRuleError(`paymentDay must be an integer in [1, 31], or -1 for the last day, got ${r.paymentDay}`);
  }
  return r;
}
function daysInMonth(year, month1) {
  return new Date(Date.UTC(year, month1, 0)).getUTCDate();
}
function clampDay(year, month1, day) {
  const last = daysInMonth(year, month1);
  if (day === -1)
    return last;
  return Math.min(day, last);
}
function ymd(date) {
  const [y, m, d] = date.split("-").map(Number);
  return { y, m, d };
}
function iso(y, m1, d) {
  return assertIsoDate(`${String(y).padStart(4, "0")}-${String(m1).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
}
function addMonths(y, m1, delta) {
  const zero = m1 - 1 + delta;
  return { y: y + Math.floor(zero / 12), m: (zero % 12 + 12) % 12 + 1 };
}
function billingDatesFor(purchaseDate, rule) {
  assertCardCycleRule(rule);
  const { y, m, d } = ymd(purchaseDate);
  const closeDayThisMonth = clampDay(y, m, rule.cycleCloseDay);
  const closeYm = d <= closeDayThisMonth ? { y, m } : addMonths(y, m, 1);
  const closeDay = clampDay(closeYm.y, closeYm.m, rule.cycleCloseDay);
  const closeDate = iso(closeYm.y, closeYm.m, closeDay);
  const payYm = addMonths(closeYm.y, closeYm.m, rule.paymentMonthOffset);
  const payDay = clampDay(payYm.y, payYm.m, rule.paymentDay);
  const paymentDate = iso(payYm.y, payYm.m, payDay);
  if (paymentDate < closeDate) {
    throw new CardCycleRuleError(`this rule pays a bill on ${paymentDate}, before its cycle closes on ${closeDate}. Increase paymentMonthOffset.`);
  }
  return { closeDate, paymentDate };
}
function cycleRangeFor(closeDate, rule) {
  assertCardCycleRule(rule);
  const { y, m } = ymd(closeDate);
  const prev = addMonths(y, m, -1);
  const prevClose = clampDay(prev.y, prev.m, rule.cycleCloseDay);
  const dayAfterPrevClose = nextDay(iso(prev.y, prev.m, prevClose));
  return { from: dayAfterPrevClose, to: closeDate };
}
function nextDay(date) {
  const t = /* @__PURE__ */ new Date(`${date}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() + 1);
  return assertIsoDate(t.toISOString().slice(0, 10));
}
function upcomingBills(from, until, rule) {
  assertCardCycleRule(rule);
  const out2 = [];
  const seen = /* @__PURE__ */ new Set();
  const start = ymd(from);
  const back = addMonths(start.y, start.m, -(rule.paymentMonthOffset + 2));
  let cursor = iso(back.y, back.m, 1);
  const end = ymd(until);
  const horizon = addMonths(end.y, end.m, rule.paymentMonthOffset + 1);
  const stop = iso(horizon.y, horizon.m, clampDay(horizon.y, horizon.m, 28));
  while (cursor <= stop) {
    const b = billingDatesFor(cursor, rule);
    if (!seen.has(b.closeDate) && b.paymentDate > from && b.paymentDate <= until) {
      seen.add(b.closeDate);
      out2.push(b);
    }
    cursor = nextDay(b.closeDate);
  }
  return out2.sort((a, b) => a.paymentDate < b.paymentDate ? -1 : 1);
}

// ../core/dist/domain/rate.js
var RATE_SCALE = 10n ** 18n;
var RATE_ONE = RATE_SCALE;
var RateError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "RateError";
  }
};
var PERCENT_RE = /^(\d+)(?:\.(\d+))?$/;
function parseAnnualPercent(text) {
  const m = PERCENT_RE.exec(text.trim());
  if (!m) {
    throw new RateError(`${JSON.stringify(text)} is not an annual percentage. Write it the way the contract does, e.g. "4.2" for 4.2%.`);
  }
  const [, whole, frac = ""] = m;
  if (frac.length > 12)
    throw new RateError(`${text}: more than 12 decimal places in a rate is noise`);
  const scaled = BigInt(`${whole}${frac.padEnd(18, "0")}`);
  return scaled / 100n;
}
function monthlyFromAnnual(annualScaled) {
  return annualScaled / 12n;
}
function mulRate(a, b) {
  return a * b / RATE_SCALE;
}
function powRate(base, n) {
  if (!Number.isInteger(n) || n < 0)
    throw new RateError(`exponent must be a non-negative integer, got ${n}`);
  let result = RATE_ONE;
  let b = base;
  let e = n;
  while (e > 0) {
    if (e & 1)
      result = mulRate(result, b);
    b = mulRate(b, b);
    e >>= 1;
  }
  return result;
}
function applyRate(amountMinor, rateScaled) {
  return roundDiv(amountMinor * rateScaled, RATE_SCALE);
}
function roundDiv(numerator, denominator) {
  if (denominator === 0n)
    throw new RateError("division by zero");
  const negative = numerator < 0n !== denominator < 0n;
  const n = numerator < 0n ? -numerator : numerator;
  const d = denominator < 0n ? -denominator : denominator;
  const q = n / d;
  const r = n % d;
  const rounded = r * 2n >= d ? q + 1n : q;
  return negative ? -rounded : rounded;
}
function formatAnnualPercent(annualScaled, places = 3) {
  const pct = annualScaled * 100n;
  const divisor = RATE_SCALE / 10n ** BigInt(places);
  const v = roundDiv(pct, divisor);
  const s = v.toString().padStart(places + 1, "0");
  const cut = s.length - places;
  return places === 0 ? s : `${s.slice(0, cut)}.${s.slice(cut)}`;
}

// ../core/dist/domain/fx.js
var FxError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "FxError";
  }
};
var RATE_RE = /^(\d+)(?:\.(\d+))?$/;
function parseRate(text) {
  const m = RATE_RE.exec(text.trim());
  if (!m) {
    throw new FxError(`${JSON.stringify(text)} is not a plain decimal rate. No exponents, no separators, no currency symbols.`);
  }
  const [, whole, frac = ""] = m;
  if (frac.length > 18)
    throw new FxError(`${text}: more than 18 decimal places in a rate is noise`);
  const scaled = BigInt(`${whole}${frac.padEnd(18, "0")}`);
  if (scaled === 0n)
    throw new FxError("a zero exchange rate is not a rate");
  return scaled;
}
function formatRate(scaled, places = 6) {
  const divisor = RATE_SCALE / 10n ** BigInt(places);
  const v = roundDiv(scaled, divisor);
  const s = v.toString().padStart(places + 1, "0");
  const cut = s.length - places;
  return places === 0 ? s : `${s.slice(0, cut)}.${s.slice(cut)}`.replace(/\.?0+$/, "");
}
function resolveRate(rates, q) {
  if (q.base === q.quote) {
    return { kind: "exact", rate: RATE_SCALE, rateIds: [], asOf: q.asOf, explanation: "same commodity" };
  }
  const usable = rates.filter((r) => r.asOf <= q.asOf && (!q.preferredSource || r.source === q.preferredSource));
  const newestFirst = [...usable].sort((a, b) => a.asOf < b.asOf ? 1 : a.asOf > b.asOf ? -1 : 0);
  const direct = newestFirst.find((r) => r.base === q.base && r.quote === q.quote);
  if (direct?.asOf === q.asOf) {
    return {
      kind: "exact",
      rate: parseRate(direct.rate),
      rateIds: [direct.id],
      asOf: direct.asOf,
      explanation: `${direct.source} ${direct.asOf}`
    };
  }
  if (direct && daysBetween(direct.asOf, q.asOf) <= q.maxStalenessDays) {
    return {
      kind: "stale",
      rate: parseRate(direct.rate),
      rateIds: [direct.id],
      asOf: direct.asOf,
      explanation: `${direct.source} ${direct.asOf}, ${daysBetween(direct.asOf, q.asOf)}\uC77C \uC804`
    };
  }
  const inverse = newestFirst.find((r) => r.base === q.quote && r.quote === q.base && daysBetween(r.asOf, q.asOf) <= q.maxStalenessDays);
  if (inverse) {
    return {
      kind: "inverse",
      rate: invert(parseRate(inverse.rate)),
      rateIds: [inverse.id],
      asOf: inverse.asOf,
      explanation: `1 / (${inverse.base}\u2192${inverse.quote} ${inverse.asOf})`
    };
  }
  if (q.base !== q.functional && q.quote !== q.functional) {
    const leg1 = findAnyDirection(newestFirst, q.base, q.functional, q.asOf, q.maxStalenessDays);
    const leg2 = findAnyDirection(newestFirst, q.functional, q.quote, q.asOf, q.maxStalenessDays);
    if (leg1 && leg2) {
      return {
        kind: "triangulated",
        rate: leg1.rate * leg2.rate / RATE_SCALE,
        rateIds: [...leg1.ids, ...leg2.ids],
        asOf: leg1.asOf < leg2.asOf ? leg1.asOf : leg2.asOf,
        explanation: `${q.base}\u2192${q.functional}\u2192${q.quote}`
      };
    }
  }
  throw new FxError(`no ${q.base}\u2192${q.quote} rate for ${q.asOf} within ${q.maxStalenessDays} days, and none to triangulate through ${q.functional}. Add one with \`holiday fx add\`, or supply the total directly with '@@'. A missing rate is a question \u2014 this will not guess 1.0.`);
}
function findAnyDirection(rates, base, quote, asOf, maxStalenessDays) {
  const fwd = rates.find((r) => r.base === base && r.quote === quote && daysBetween(r.asOf, asOf) <= maxStalenessDays);
  if (fwd)
    return { rate: parseRate(fwd.rate), ids: [fwd.id], asOf: fwd.asOf };
  const rev = rates.find((r) => r.base === quote && r.quote === base && daysBetween(r.asOf, asOf) <= maxStalenessDays);
  if (rev)
    return { rate: invert(parseRate(rev.rate)), ids: [rev.id], asOf: rev.asOf };
  return null;
}
function invert(scaled) {
  return roundDiv(RATE_SCALE * RATE_SCALE, scaled);
}
function daysBetween(a, b) {
  const ms = (/* @__PURE__ */ new Date(`${b}T00:00:00Z`)).getTime() - (/* @__PURE__ */ new Date(`${a}T00:00:00Z`)).getTime();
  return Math.round(ms / 864e5);
}
function convert(amountMinor, rate, fromExponent, toExponent) {
  const scaleShift = 10n ** BigInt(Math.abs(toExponent - fromExponent));
  const raw = amountMinor * rate;
  const adjusted = toExponent >= fromExponent ? raw * scaleShift : raw / scaleShift;
  return roundDiv(adjusted, RATE_SCALE);
}

// ../core/dist/domain/close.js
var CloseError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "CloseError";
  }
};
var MONTH_RE = /^(\d{4})-(\d{2})$/;
function monthBounds(spec) {
  const m = MONTH_RE.exec(spec.trim());
  if (!m)
    throw new CloseError(`${JSON.stringify(spec)} is not a month. Write it as YYYY-MM, e.g. 2026-07.`);
  const [, y, mo] = m;
  const year = Number(y);
  const month = Number(mo);
  if (month < 1 || month > 12)
    throw new CloseError(`${spec}: month must be 01-12`);
  const last = daysInMonth(year, month);
  return {
    id: `month:${y}-${mo}`,
    start: `${y}-${mo}-01`,
    end: `${y}-${mo}-${String(last).padStart(2, "0")}`
  };
}
function checkAssertion(expectedMinor, actualMinor) {
  const delta = actualMinor - expectedMinor;
  return { deltaMinor: delta, ok: delta === 0n };
}
function revaluationLines(inputs) {
  return inputs.map((i) => ({
    accountId: i.accountId,
    accountCode: i.accountCode,
    commodity: i.commodity,
    deltaMinor: i.targetMinor - i.carryingMinor
  })).filter((l) => l.deltaMinor !== 0n);
}
function closeGate(draftCount, assertions) {
  const failed = assertions.filter((a) => !a.ok);
  const parts = [];
  if (draftCount > 0) {
    parts.push(`${draftCount}\uAC74\uC758 \uB4DC\uB798\uD504\uD2B8\uAC00 \uC774 \uAE30\uAC04\uC5D0 \uB0A8\uC544 \uC788\uC2B5\uB2C8\uB2E4. \uAC80\uD1A0\uB418\uC9C0 \uC54A\uC740 \uCEA1\uCCD0\uAC00 \uC788\uB294 \uB2EC\uC740 \uB9C8\uAC10\uB41C \uAC8C \uC544\uB2D9\uB2C8\uB2E4 \u2014 \`holiday review list\`\uB85C \uCC98\uB9AC\uD558\uC138\uC694.`);
  }
  for (const a of failed) {
    parts.push(`${a.accountCode} (${a.asOf}): \uC7A5\uBD80\uB294 ${a.actualMinor}, \uB2E8\uC5B8\uC740 ${a.expectedMinor} \u2014 ${a.deltaMinor} \uCC28\uC774.`);
  }
  return {
    ok: parts.length === 0,
    draftCount,
    failedAssertions: failed,
    explanation: parts.length === 0 ? `\uB9C8\uAC10 \uAC00\uB2A5` : parts.join("\n")
  };
}

// ../core/dist/domain/loan.js
var LoanError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "LoanError";
  }
};
function buildLoanSchedule(opts) {
  const { principalMinor, monthlyRate, method, termMonths, firstPaymentDate, paymentDay } = opts;
  if (principalMinor <= 0n)
    throw new LoanError(`a loan principal must be positive, got ${principalMinor}`);
  if (!Number.isInteger(termMonths) || termMonths < 1) {
    throw new LoanError(`termMonths must be a positive integer, got ${termMonths}`);
  }
  if (monthlyRate < 0n)
    throw new LoanError("a negative interest rate is not supported");
  if (method === "annuity" && monthlyRate === 0n) {
    throw new LoanError("a 0% loan cannot use the annuity method \u2014 it is equal_principal. Use that.");
  }
  const dates = paymentDates(firstPaymentDate, paymentDay, termMonths);
  const principals = principalSplit(principalMinor, monthlyRate, method, termMonths);
  const rows = [];
  let opening = principalMinor;
  for (let i = 0; i < termMonths; i++) {
    const interest = applyRate(opening, monthlyRate);
    const principal = principals[i];
    const closing = opening - principal;
    rows.push({
      seq: i + 1,
      dueDate: dates[i],
      openingMinor: opening,
      principalMinor: principal,
      interestMinor: interest,
      closingMinor: closing
    });
    opening = closing;
  }
  return rows;
}
function principalSplit(principalMinor, monthlyRate, method, termMonths) {
  const n = BigInt(termMonths);
  if (method === "interest_only") {
    return Array.from({ length: termMonths }, () => 0n);
  }
  if (method === "bullet") {
    const rows2 = Array.from({ length: termMonths }, () => 0n);
    rows2[termMonths - 1] = principalMinor;
    return rows2;
  }
  if (method === "equal_principal") {
    const base = principalMinor / n;
    const rows2 = Array.from({ length: termMonths }, () => base);
    rows2[termMonths - 1] = principalMinor - base * (n - 1n);
    return rows2;
  }
  const factor = powRate(RATE_ONE + monthlyRate, termMonths);
  const denominator = factor - RATE_ONE;
  if (denominator <= 0n)
    throw new LoanError("rate/term combination produced a degenerate annuity factor");
  const ratio = roundDiv(mulRate(monthlyRate, factor) * RATE_ONE, denominator);
  const payment = applyRate(principalMinor, ratio);
  const rows = [];
  let opening = principalMinor;
  for (let i = 0; i < termMonths; i++) {
    const interest = applyRate(opening, monthlyRate);
    let principal = payment - interest;
    if (i === termMonths - 1 || principal > opening)
      principal = opening;
    if (principal < 0n) {
      throw new LoanError(`the level payment (${payment}) does not cover the interest (${interest}) at month ${i + 1}. This loan never amortizes \u2014 check the rate and term.`);
    }
    rows.push(principal);
    opening -= principal;
  }
  return rows;
}
function paymentDates(first, paymentDay, termMonths) {
  const [fy, fm] = first.split("-").map(Number);
  return Array.from({ length: termMonths }, (_, i) => {
    const zero = fm - 1 + i;
    const y = fy + Math.floor(zero / 12);
    const m = (zero % 12 + 12) % 12 + 1;
    const d = clampDay(y, m, paymentDay);
    return assertIsoDate(`${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  });
}
function schedulePrincipal(rows) {
  return rows.reduce((s, r) => s + r.principalMinor, 0n);
}
function scheduleInterest(rows) {
  return rows.reduce((s, r) => s + r.interestMinor, 0n);
}
function rowForDate(rows, date) {
  return rows.find((r) => r.dueDate === date) ?? null;
}
function loanCheck(opts) {
  const { rows, ledgerBalanceMinor, asOf, principalMinor } = opts;
  const due = rows.filter((r) => r.dueDate <= asOf);
  const expected = due.length > 0 ? due[due.length - 1].closingMinor : principalMinor;
  const actual = -ledgerBalanceMinor;
  const delta = actual - expected;
  return {
    asOf,
    expectedMinor: expected,
    actualMinor: actual,
    deltaMinor: delta,
    ok: delta === 0n,
    explanation: explain(delta, due.length, rows.length)
  };
}
function explain(delta, paidRows, totalRows) {
  if (delta === 0n)
    return `on schedule \u2014 ${paidRows}/${totalRows} payments due so far`;
  if (delta > 0n) {
    return `you owe ${delta} more than the schedule expects. Usually a missed or partial payment, an unrecorded rate change, or a fee added to the balance.`;
  }
  return `you owe ${-delta} less than the schedule expects. Usually a prepayment (\uC911\uB3C4\uC0C1\uD658), or a payment recorded with too much going to principal.`;
}
function describeMethod(m) {
  switch (m) {
    case "annuity":
      return "\uC6D0\uB9AC\uAE08\uADE0\uB4F1";
    case "equal_principal":
      return "\uC6D0\uAE08\uADE0\uB4F1";
    case "bullet":
      return "\uB9CC\uAE30\uC77C\uC2DC\uC0C1\uD658";
    case "interest_only":
      return "\uAC70\uCE58 (\uC774\uC790\uB9CC)";
  }
}

// ../core/dist/domain/installment.js
var InstallmentError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "InstallmentError";
  }
};
function splitTotal(totalMinor, months, remainderOn = "first") {
  if (!Number.isInteger(months) || months < 1) {
    throw new InstallmentError(`months must be a positive integer, got ${months}`);
  }
  if (totalMinor <= 0n) {
    throw new InstallmentError(`an installment total must be positive, got ${totalMinor}`);
  }
  const n = BigInt(months);
  const base = totalMinor / n;
  const remainder = totalMinor - base * n;
  const rows = Array.from({ length: months }, () => base);
  const target = remainderOn === "first" ? 0 : months - 1;
  rows[target] = rows[target] + remainder;
  return rows;
}
function buildInstallmentSchedule(opts) {
  const { purchasedOn, months, totalMinor, cardRule, fees } = opts;
  assertCardCycleRule(cardRule);
  if (fees && fees.length !== months) {
    throw new InstallmentError(`a ${months}-month plan needs ${months} fee values, got ${fees.length}. Read one per row off the statement \u2014 they are not all the same, and they are not computed.`);
  }
  if (fees?.some((f) => f < 0n)) {
    throw new InstallmentError("a \uD560\uBD80\uC218\uC218\uB8CC cannot be negative");
  }
  const principals = splitTotal(totalMinor, months, opts.remainderOn ?? "first");
  const first = billingDatesFor(purchasedOn, cardRule).paymentDate;
  const [fy, fm] = first.split("-").map(Number);
  return principals.map((principalMinor, i) => {
    const zero = fm - 1 + i;
    const y = fy + Math.floor(zero / 12);
    const m = (zero % 12 + 12) % 12 + 1;
    const day = clampDay(y, m, cardRule.paymentDay);
    return {
      seq: i + 1,
      paymentDate: assertIsoDate(`${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`),
      principalMinor,
      feeMinor: fees?.[i] ?? 0n
    };
  });
}
function reviseSchedule(rows, totalMinor) {
  if (rows.length === 0)
    throw new InstallmentError("a revised schedule needs at least one row");
  const principal = rows.reduce((s, r) => s + r.principalMinor, 0n);
  if (principal !== totalMinor) {
    throw new InstallmentError(`revised rows have principal summing to ${principal}, but the purchase was ${totalMinor}. Fees are separate \u2014 do not fold them into the principal.`);
  }
  if (rows.some((r) => r.feeMinor < 0n))
    throw new InstallmentError("a \uD560\uBD80\uC218\uC218\uB8CC cannot be negative");
  const seqs = rows.map((r) => r.seq).sort((a, b) => a - b);
  if (seqs.some((s, i) => s !== i + 1)) {
    throw new InstallmentError(`rows must be numbered 1..${rows.length} with no gaps, got ${seqs.join(",")}`);
  }
  const sorted = [...rows].sort((a, b) => a.seq - b.seq);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].paymentDate <= sorted[i - 1].paymentDate) {
      throw new InstallmentError(`row ${sorted[i].seq} is due ${sorted[i].paymentDate}, not after row ${sorted[i - 1].seq} (${sorted[i - 1].paymentDate}). Two rows on one date would double-count.`);
    }
  }
  return sorted;
}

// ../core/dist/domain/recurring.js
var CadenceError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "CadenceError";
  }
};
function assertCadence(c) {
  const dayOk = c.dayOfMonth === -1 || Number.isInteger(c.dayOfMonth) && c.dayOfMonth >= 1 && c.dayOfMonth <= 31;
  if (!dayOk) {
    throw new CadenceError(`dayOfMonth must be an integer in [1, 31], or -1 for the last day, got ${c.dayOfMonth}`);
  }
  if (c.kind === "yearly" && (!Number.isInteger(c.month) || c.month < 1 || c.month > 12)) {
    throw new CadenceError(`month must be an integer in [1, 12], got ${c.month}`);
  }
  return c;
}
function iso2(y, m, d) {
  return assertIsoDate(`${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
}
function occurrencesBetween(cadence, from, to) {
  assertCadence(cadence);
  if (from > to)
    return [];
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  const out2 = [];
  if (cadence.kind === "monthly") {
    for (let y = fy, m = fm; y < ty || y === ty && m <= tm; ) {
      const date = iso2(y, m, clampDay(y, m, cadence.dayOfMonth));
      if (date >= from && date <= to)
        out2.push(date);
      m += 1;
      if (m > 12) {
        m = 1;
        y += 1;
      }
    }
    return out2;
  }
  for (let y = fy; y <= ty; y++) {
    const date = iso2(y, cadence.month, clampDay(y, cadence.month, cadence.dayOfMonth));
    if (date >= from && date <= to)
      out2.push(date);
  }
  return out2;
}
function isActiveOn(r, date) {
  if (date < r.activeFrom)
    return false;
  return r.activeTo === null || date <= r.activeTo;
}
function describeCadence(c) {
  const day = c.dayOfMonth === -1 ? "\uB9D0\uC77C" : `${c.dayOfMonth}\uC77C`;
  return c.kind === "monthly" ? `\uB9E4\uC6D4 ${day}` : `\uB9E4\uB144 ${c.month}\uC6D4 ${day}`;
}

// ../core/dist/domain/ingest.js
var DEDUPE_KEY_VERSION = 1;
var KOREAN_CORP_PATTERNS = [
  /\(주\)/g,
  /\（주\）/g,
  /주식회사/g,
  /\(유\)/g,
  /유한회사/g
];
function normalizeMerchant(raw) {
  if (!raw)
    return "";
  let s = raw.normalize("NFKC").toLowerCase();
  for (const p of KOREAN_CORP_PATTERNS)
    s = s.replace(p, " ");
  s = s.replace(/[*_|]+/g, " ");
  return s.replace(/\s+/g, " ").trim();
}
async function dedupeKey(t) {
  if (t.externalRef) {
    return { key: await sha256(`v${DEDUPE_KEY_VERSION}|ref|${t.accountId}|${t.externalRef}`), authority: "external_ref" };
  }
  const parts = [
    `v${DEDUPE_KEY_VERSION}`,
    "nat",
    t.accountId,
    t.date,
    t.unitsMinor.toString(),
    t.commodity,
    normalizeMerchant(t.merchant)
  ];
  return { key: await sha256(parts.join("|")), authority: "natural" };
}
async function sha256(s) {
  const bytes = new TextEncoder().encode(s);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function sha256Bytes(bytes) {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
var NEAR_DAYS = 3;
function findNearDuplicates(candidate, existing) {
  const m = normalizeMerchant(candidate.merchant);
  return existing.filter((e) => {
    if (e.accountId !== candidate.accountId)
      return false;
    if (e.commodity !== candidate.commodity)
      return false;
    if (e.unitsMinor !== candidate.unitsMinor)
      return false;
    return Math.abs(daysBetween2(e.date, candidate.date)) <= NEAR_DAYS;
  }).map((e) => {
    const em = normalizeMerchant(e.merchant);
    const sameDay = e.date === candidate.date;
    const sameMerchant = em === m && m !== "";
    return {
      txnId: e.txnId,
      date: e.date,
      merchant: e.merchant,
      unitsMinor: e.unitsMinor,
      reason: sameDay ? sameMerchant ? "same account, amount, merchant and date \u2014 but this may genuinely be a second purchase" : "same account, amount and date" : `same account and amount, ${Math.abs(daysBetween2(e.date, candidate.date))} day(s) apart \u2014 the app and the statement often disagree on the date`
    };
  });
}
function daysBetween2(a, b) {
  const ms = (/* @__PURE__ */ new Date(`${b}T00:00:00Z`)).getTime() - (/* @__PURE__ */ new Date(`${a}T00:00:00Z`)).getTime();
  return Math.round(ms / 864e5);
}

// ../core/dist/domain/cashflow.js
function projectCardBills(opts) {
  const { cards, postings, today: today2, until } = opts;
  const byTxn = /* @__PURE__ */ new Map();
  for (const p of postings) {
    const list = byTxn.get(p.txnId);
    if (list)
      list.push(p);
    else
      byTxn.set(p.txnId, [p]);
  }
  const out2 = [];
  for (const card2 of cards) {
    const isPayment = (txnId) => (byTxn.get(txnId) ?? []).some((p) => p.accountId === card2.fundingAccountId);
    for (const bill of upcomingBills(today2, until, card2.rule)) {
      const range = cycleRangeFor(bill.closeDate, card2.rule);
      let sum = 0n;
      for (const p of postings) {
        if (p.accountId !== card2.accountId)
          continue;
        if (p.txnDate < range.from || p.txnDate > range.to)
          continue;
        if (isPayment(p.txnId))
          continue;
        sum += p.weightMinor;
      }
      const amountMinor = -sum;
      if (amountMinor === 0n)
        continue;
      out2.push({
        cardAccountId: card2.accountId,
        cardCode: card2.accountCode,
        cardLabel: card2.label,
        fundingAccountId: card2.fundingAccountId,
        closeDate: bill.closeDate,
        paymentDate: bill.paymentDate,
        amountMinor,
        cycleFrom: range.from,
        cycleTo: range.to
      });
    }
  }
  return out2.sort((a, b) => a.paymentDate < b.paymentDate ? -1 : a.paymentDate > b.paymentDate ? 1 : a.cardCode < b.cardCode ? -1 : 1);
}
function projectInstallments(opts) {
  const out2 = [];
  for (const plan of opts.installments) {
    const fundingAccountId = opts.fundingByCard.get(plan.cardAccountId);
    if (!fundingAccountId)
      continue;
    for (const r of plan.rows) {
      if (r.paymentDate <= opts.today || r.paymentDate > opts.until)
        continue;
      out2.push({
        kind: "installment",
        installmentId: plan.id,
        cardAccountId: plan.cardAccountId,
        liabilityAccountId: plan.liabilityAccountId,
        fundingAccountId,
        label: plan.label,
        paymentDate: r.paymentDate,
        amountMinor: r.principalMinor + r.feeMinor,
        seq: r.seq,
        months: plan.months
      });
    }
  }
  return out2.sort((a, b) => a.paymentDate < b.paymentDate ? -1 : 1);
}
function projectRecurring(opts) {
  const out2 = [];
  for (const r of opts.recurring) {
    const card2 = opts.cardRules.get(r.fundingAccountId);
    for (const occurredOn of occurrencesBetween(r.cadence, nextDay(opts.today), opts.until)) {
      if (!isActiveOn(r, occurredOn))
        continue;
      const paymentDate = card2 ? billingDatesFor(occurredOn, card2.rule).paymentDate : occurredOn;
      if (paymentDate <= opts.today || paymentDate > opts.until)
        continue;
      out2.push({
        kind: "recurring",
        recurringId: r.id,
        label: r.label,
        expenseAccountId: r.expenseAccountId,
        fundingAccountId: card2 ? card2.fundingAccountId : r.fundingAccountId,
        viaCardAccountId: card2 ? r.fundingAccountId : null,
        occurredOn,
        paymentDate,
        amountMinor: r.amountMinor
      });
    }
  }
  return out2.sort((a, b) => a.paymentDate < b.paymentDate ? -1 : 1);
}
function projectLoans(opts) {
  const out2 = [];
  for (const l of opts.loans) {
    for (const r of l.rows) {
      if (r.dueDate <= opts.today || r.dueDate > opts.until)
        continue;
      const amountMinor = r.principalMinor + r.interestMinor;
      if (amountMinor === 0n)
        continue;
      out2.push({
        kind: "loan",
        loanAccountId: l.accountId,
        fundingAccountId: l.fundingAccountId,
        label: l.label,
        paymentDate: r.dueDate,
        amountMinor,
        principalMinor: r.principalMinor,
        interestMinor: r.interestMinor,
        seq: r.seq,
        termMonths: l.termMonths
      });
    }
  }
  return out2.sort((a, b) => a.paymentDate < b.paymentDate ? -1 : 1);
}
function cashRunway(openingCashMinor, outflows) {
  const byDate = /* @__PURE__ */ new Map();
  for (const b of outflows) {
    const list = byDate.get(b.paymentDate);
    if (list)
      list.push(b);
    else
      byDate.set(b.paymentDate, [b]);
  }
  const dates = [...byDate.keys()].sort();
  let balance = openingCashMinor;
  return dates.map((date) => {
    const items = byDate.get(date);
    const outflow = items.reduce((s, b) => s + b.amountMinor, 0n);
    balance -= outflow;
    return { date, outflowMinor: outflow, balanceAfterMinor: balance, items };
  });
}

// ../core/dist/ports/ledger-store.js
var TierContractError = class extends Error {
  constructor(storeName, missing) {
    super(`${storeName} declares tier 'engine' but does not satisfy the engine contract: missing ${missing.join(", ")}. An engine-tier store is the system of record for a double-entry ledger; without these guarantees it cannot promise the books balance. Declare tier 'projection' instead.`);
    this.name = "TierContractError";
  }
};
function assertEngineTier(storeName, caps) {
  if (caps.tier !== "engine")
    return;
  const missing = [];
  if (!caps.atomicMultiRowWrite)
    missing.push("atomicMultiRowWrite");
  if (!caps.uniqueConstraints)
    missing.push("uniqueConstraints");
  if (!caps.readAfterWriteConsistency)
    missing.push("readAfterWriteConsistency");
  if (missing.length > 0)
    throw new TierContractError(storeName, missing);
}

// src/ingest.ts
var INGEST_SUBMISSION = external_exports.object({
  /** sha256 of the image bytes, if the agent has the file. Blocks a re-submit of the same image. */
  sourceSha256: external_exports.string().regex(/^[0-9a-f]{64}$/).optional(),
  sourceName: external_exports.string().optional(),
  items: external_exports.array(
    external_exports.object({
      date: external_exports.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      payee: external_exports.string().optional(),
      narration: external_exports.string().optional(),
      /** The issuer's own transaction id, if the model could read one. Authoritative. */
      externalRef: external_exports.string().optional(),
      /**
       * Which leg is the money side, for duplicate detection. Defaults to the
       * first liability or asset leg — the card or the bank, not the category.
       */
      dedupeOn: external_exports.string().optional(),
      legs: external_exports.array(
        external_exports.object({
          account: external_exports.string(),
          amount: external_exports.string(),
          commodity: external_exports.string(),
          /** Total in the booking commodity, for a non-functional leg. Same as `@@`. */
          weight: external_exports.string().optional()
        })
      ).min(2, { message: "a transaction needs at least two legs" })
    })
  ).min(1, { message: "nothing to ingest" })
});

// src/legs.ts
function parseLeg(leg, amounts2, functionalCurrency, resolveAccount, deriveWeight) {
  const parts = leg.trim().split(/\s+/);
  const [code, amountText, commodity, at, weightText] = parts;
  if (!code || !amountText || !commodity) {
    throw new UsageError(
      `cannot parse leg ${JSON.stringify(leg)}. Expected "ACCOUNT AMOUNT COMMODITY" or "ACCOUNT AMOUNT COMMODITY @@ TOTAL_IN_${functionalCurrency}".`
    );
  }
  if (at !== void 0 && at !== "@@") {
    if (at === "@") {
      throw new UsageError(
        `leg ${JSON.stringify(leg)} uses '@' (a per-unit rate). This ledger only accepts '@@' (a total amount), because deriving a counter-amount by multiplying a rate does not land on an exact integer and would force a tolerance. Write the total you actually paid.`
      );
    }
    throw new UsageError(`unexpected token ${JSON.stringify(at)} in leg ${JSON.stringify(leg)}`);
  }
  const account2 = resolveAccount(code);
  const units = amounts2.parse(amountText, commodity);
  const isFunctional = units.commodity === functionalCurrency;
  if (at === "@@") {
    if (!weightText) throw new UsageError(`leg ${JSON.stringify(leg)} has '@@' with no total after it`);
    if (isFunctional) {
      throw new UsageError(
        `leg ${JSON.stringify(leg)} is already in ${functionalCurrency}, so '@@' is meaningless \u2014 its weight is its amount.`
      );
    }
    return {
      accountId: account2.id,
      units,
      weightMinor: amounts2.parse(weightText, functionalCurrency).minor,
      // Both sides observed, so the implied rate is a fact rather than a lookup.
      weightSource: "actual"
    };
  }
  if (!isFunctional) {
    if (deriveWeight) {
      const { weightMinor, fxRateText, fxRateId } = deriveWeight(units);
      return { accountId: account2.id, units, weightMinor, weightSource: "rate", fxRateText, fxRateId };
    }
    throw new UsageError(
      `leg ${JSON.stringify(leg)} is in ${units.commodity}, not ${functionalCurrency}, so its ${functionalCurrency} value cannot be inferred. Add "@@ <total in ${functionalCurrency}>", or record a rate with \`holiday fx add\`.`
    );
  }
  return { accountId: account2.id, units };
}
var UsageError = class extends Error {
  code = "usage";
  constructor(message) {
    super(message);
    this.name = "UsageError";
  }
};

// src/workspace.ts
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

// ../store-sql/dist/chain.js
import { createHash } from "node:crypto";
var CHAIN_HASH_VERSION = 1;
var GENESIS_HASH = "0".repeat(64);
var sha2562 = (s) => createHash("sha256").update(s, "utf8").digest("hex");
function txnContentHash(tx, version = CHAIN_HASH_VERSION) {
  const parts = [
    `v${version}`,
    tx.id,
    tx.date,
    tx.bookingCommodity,
    tx.payee ?? "",
    tx.narration,
    tx.systemKind ?? "",
    tx.correctsTxnId ?? "",
    tx.sourceItemId ?? "",
    tx.fxEstimated ? "1" : "0",
    // Already sorted by Txn.create().
    tx.tags.join(","),
    stableJson(tx.meta)
  ];
  for (const p of [...tx.postings].sort((a, b) => a.seq - b.seq)) {
    parts.push([
      p.seq,
      p.accountId,
      p.units.minor.toString(),
      p.units.commodity,
      p.weightMinor.toString(),
      p.weightSource,
      p.fxRateText ?? "",
      p.fxRateId ?? "",
      p.lotId ?? "",
      p.kind,
      p.memo ?? ""
    ].join(""));
  }
  return sha2562(parts.join(""));
}
function chainHash(r, version = CHAIN_HASH_VERSION) {
  return sha2562([`v${version}`, r.seq.toString(), r.at, r.event, r.subject, r.detail, r.prevHash].join(""));
}
function stableJson(v) {
  return JSON.stringify(normalize(v));
}
function normalize(v) {
  if (typeof v === "bigint")
    return v.toString();
  if (typeof v === "number") {
    if (!Number.isFinite(v))
      throw new TypeError(`cannot hash a non-finite number: ${v}`);
    if (!Number.isInteger(v))
      throw new TypeError(`cannot hash a non-integer number: ${v}`);
    return v;
  }
  if (v === null || typeof v !== "object")
    return v;
  if (Array.isArray(v))
    return v.map(normalize);
  const out2 = {};
  for (const k of Object.keys(v).sort()) {
    out2[k] = normalize(v[k]);
  }
  return out2;
}

// ../store-sql/dist/migrate.js
var BOOKKEEPING = `
CREATE TABLE IF NOT EXISTS __holiday_migrations (
  name       TEXT PRIMARY KEY,
  hash       TEXT NOT NULL,
  applied_at TEXT NOT NULL
)`;
var MigrationDriftError = class extends Error {
  constructor(name, applied, now) {
    super(`holiday: migration ${name} has changed since it was applied to this ledger.
  applied: ${applied}
  now:     ${now}
Migrations are append-only. This ledger ran the old version, so re-running the new one would leave it in a state no other copy shares. Add a new migration instead of editing this one.`);
    this.name = "MigrationDriftError";
  }
};
async function runMigrations(db, migrations, now) {
  await db.exec(BOOKKEEPING);
  const seen = new Map((await db.all("SELECT name, hash FROM __holiday_migrations")).map((r) => [
    r.name,
    r.hash
  ]));
  const applied = [];
  for (const m of migrations) {
    const priorHash = seen.get(m.name);
    if (priorHash !== void 0) {
      if (priorHash !== m.hash)
        throw new MigrationDriftError(m.name, priorHash, m.hash);
      continue;
    }
    await db.transaction(async (tx) => {
      for (const statement of m.statements)
        await tx.exec(statement);
      await tx.run("INSERT INTO __holiday_migrations (name, hash, applied_at) VALUES (?, ?, ?)", m.name, m.hash, now());
    });
    applied.push(m.name);
  }
  return { applied, alreadyApplied: seen.size };
}

// ../store-sql/dist/num.js
function toInt(v) {
  const n = typeof v === "bigint" ? Number(v) : v;
  if (!Number.isSafeInteger(n))
    throw new RangeError(`expected a small integer, got ${v}`);
  return n;
}
function toBool(v) {
  return toInt(v) === 1;
}
function toBigInt(v) {
  return typeof v === "bigint" ? v : BigInt(v);
}

// ../store-sql/dist/store.js
var CAPS = {
  tier: "engine",
  atomicMultiRowWrite: true,
  uniqueConstraints: true,
  readAfterWriteConsistency: true,
  serverSideAggregation: true,
  predicatePushdown: true,
  enforcesInvariantsAtRest: true,
  maxWriteOpsPerSecond: null
};
var SqlLedgerStore = class {
  name;
  capabilities = CAPS;
  #db;
  #engine;
  #opts;
  #now;
  constructor(opts) {
    this.#opts = opts;
    this.#engine = opts.engine;
    this.#now = opts.now ?? (() => (/* @__PURE__ */ new Date()).toISOString());
    this.#db = opts.engine.driver;
    this.name = opts.engine.name;
  }
  async init() {
    assertEngineTier(this.name, this.capabilities);
    await this.#engine.init?.(this.#db);
  }
  async migrate() {
    const result = await runMigrations(this.#db, this.#engine.migrations, this.#now);
    await this.#seedBook();
    return { from: result.alreadyApplied, to: result.alreadyApplied + result.applied.length };
  }
  async #seedBook() {
    const existing = await this.#db.get("SELECT functional_currency FROM book WHERE id = ?", "book");
    if (existing) {
      if (existing.functional_currency !== this.#opts.book.functionalCurrency) {
        throw new Error(`this ledger is denominated in ${existing.functional_currency}, but was opened as ${this.#opts.book.functionalCurrency}. A book's functional currency cannot be changed in place.`);
      }
      return;
    }
    await this.#db.transaction(async (tx) => {
      await tx.run(`INSERT OR IGNORE INTO commodity (code, exponent, kind, name) VALUES (?, ?, ?, ?)`, this.#opts.book.functionalCurrency, 0, "fiat", this.#opts.book.functionalCurrency);
      await tx.run(`INSERT INTO book (id, schema_version, functional_currency, close_grain, timezone, created_at)
         VALUES ('book', ?, ?, ?, ?, ?)`, this.#engine.schemaVersion, this.#opts.book.functionalCurrency, this.#opts.book.closeGrain ?? "month", this.#opts.book.timezone ?? "Asia/Seoul", this.#now());
    });
  }
  /**
   * Atomicity is the port's whole promise, so it is the driver's job — not a
   * BEGIN/COMMIT hand-written here. SQLite takes the write lock up front with
   * BEGIN IMMEDIATE; Postgres opens a real transaction on a reserved connection.
   * Both roll back on throw, and the uow is handed the transaction's driver so
   * the work cannot accidentally escape it.
   */
  async unitOfWork(fn) {
    return this.#db.transaction((tx) => fn(new SqlUow(tx, this.#now)));
  }
  async read(fn) {
    return fn(new SqlUow(this.#db, this.#now));
  }
  /**
   * The head of the audit chain.
   *
   * Not part of the LedgerStore port: a chain is one way to get tamper evidence,
   * not something every engine must offer. Anchor this value outside the file —
   * print it, commit it, mail it to yourself — and the chain stops being merely
   * self-consistent and starts being evidence.
   */
  async chainHead() {
    return await chainHeadOf(this.#db);
  }
  /**
   * Fold the WAL back into the main file.
   *
   * Matters because ledger.db is meant to be committed: without a checkpoint the
   * committed file can be missing the most recent transactions, which are still
   * sitting in the -wal that git is (correctly) ignoring. A backup that silently
   * omits last week is worse than no backup.
   */
  async checkpoint() {
    await this.#engine.checkpoint?.(this.#db);
  }
  async close() {
    await this.#db.close();
  }
};
var SqlUow = class {
  db;
  now;
  constructor(db, now) {
    this.db = db;
    this.now = now;
  }
  async getBook() {
    const r = await this.db.get("SELECT * FROM book WHERE id = ?", "book");
    if (!r)
      throw new Error("holiday: this ledger has no book \u2014 run `holiday init` first");
    return {
      schemaVersion: toInt(r.schema_version),
      functionalCurrency: r.functional_currency,
      closeGrain: r.close_grain,
      timezone: r.timezone,
      dedupeKeyVersion: toInt(r.dedupe_key_version),
      fxMaxStalenessDays: toInt(r.fx_max_staleness_days)
    };
  }
  async listCommodities() {
    return (await this.db.all("SELECT * FROM commodity ORDER BY code")).map((r) => ({
      code: r.code,
      exponent: toInt(r.exponent),
      kind: r.kind,
      name: r.name
    }));
  }
  async upsertCommodity(c) {
    await this.db.run(`INSERT INTO commodity (code, exponent, kind, name) VALUES (?, ?, ?, ?)
       ON CONFLICT(code) DO UPDATE SET exponent = excluded.exponent, kind = excluded.kind, name = excluded.name`, c.code, c.exponent, c.kind, c.name);
  }
  async getAccount(idOrCode) {
    const r = await this.db.get("SELECT * FROM account WHERE id = ? OR code = ?", idOrCode, idOrCode);
    return r ? mapAccount(r) : null;
  }
  async listAccounts(filter) {
    const where = [];
    const params = [];
    if (filter?.type) {
      where.push("type = ?");
      params.push(filter.type);
    }
    if (filter?.prefix) {
      where.push("(code = ? OR code GLOB ?)");
      params.push(filter.prefix, this.db.dialect.subtreeWildcard(filter.prefix));
    }
    if (filter?.cash !== void 0) {
      where.push("cash = ?");
      params.push(filter.cash ? 1 : 0);
    }
    if (!filter?.includeClosed)
      where.push("closed_on IS NULL");
    const sql = `SELECT * FROM account ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY code`;
    return (await this.db.all(sql, ...params)).map(mapAccount);
  }
  async upsertAccount(a) {
    await this.db.run(`INSERT INTO account (id, code, type, parent_id, commodity, monetary, cash, placeholder, opened_on, closed_on)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         code = excluded.code, type = excluded.type, parent_id = excluded.parent_id,
         commodity = excluded.commodity, monetary = excluded.monetary,
         cash = excluded.cash, placeholder = excluded.placeholder, closed_on = excluded.closed_on`, a.id, a.code, a.type, a.parentId, a.commodity, a.monetary ? 1 : 0, a.cash ? 1 : 0, a.placeholder ? 1 : 0, a.openedOn, a.closedOn);
    return a;
  }
  /**
   * txn → postings → seal.
   *
   * The seal is where the balance rule is enforced, because SQLite has no
   * deferred constraints and the running sum is legitimately non-zero while the
   * postings are still going in. Nothing unsealed is ever readable as a fact.
   */
  async appendTxn(tx, opts) {
    await this.db.run(`INSERT INTO txn (id, date, booking_commodity, payee, narration, status, system_kind,
                        corrects_txn_id, source_item_id, fx_estimated, tags_json, meta_json, sealed, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`, tx.id, tx.date, tx.bookingCommodity, tx.payee, tx.narration, opts.status, tx.systemKind, tx.correctsTxnId, tx.sourceItemId, tx.fxEstimated ? 1 : 0, JSON.stringify(tx.tags), JSON.stringify(tx.meta), this.now());
    for (const p of tx.postings) {
      await this.db.run(`INSERT INTO posting (txn_id, seq, account_id, units_minor, commodity, weight_minor,
                              weight_source, fx_rate_text, fx_rate_id, lot_id, kind, memo)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, tx.id, p.seq, p.accountId, p.units.minor, p.units.commodity, p.weightMinor, p.weightSource, p.fxRateText, p.fxRateId, p.lotId, p.kind, p.memo);
    }
    await this.db.run("UPDATE txn SET sealed = 1 WHERE id = ?", tx.id);
    await this.#appendAudit("txn_append", tx.id, {
      status: opts.status,
      contentSha256: txnContentHash(tx),
      hashVersion: CHAIN_HASH_VERSION
    });
    return tx.id;
  }
  /** Every mutation lands here. An audit trail with holes is not an audit trail. */
  async #appendAudit(event, subject, detail) {
    const head = await this.db.get("SELECT seq, hash FROM audit_log ORDER BY seq DESC LIMIT 1");
    const seq = head ? toInt(head.seq) + 1 : 1;
    const prevHash = head?.hash ?? GENESIS_HASH;
    const at = this.now();
    const detailJson = stableJson(detail);
    const hash = chainHash({ seq, at, event, subject, detail: detailJson, prevHash });
    await this.db.run("INSERT INTO audit_log (seq, at, event, subject, detail, prev_hash, hash) VALUES (?, ?, ?, ?, ?, ?, ?)", seq, at, event, subject, detailJson, prevHash, hash);
  }
  async promoteDraft(id) {
    const changed = await this.#setStatus(id, "posted", "draft", null);
    if (!changed)
      throw new Error(`holiday: ${id} is not a draft, so it cannot be accepted`);
  }
  async rejectDraft(id, reason) {
    const changed = await this.#setStatus(id, "rejected", "draft", reason);
    if (!changed)
      throw new Error(`holiday: ${id} is not a draft, so it cannot be rejected`);
  }
  async voidTxn(id, reason) {
    const changed = await this.#setStatus(id, "void", "posted", reason);
    if (!changed)
      throw new Error(`holiday: ${id} is not posted, so it cannot be voided`);
  }
  async #setStatus(id, to, from, reason) {
    const before = await this.db.get("SELECT COUNT(*) AS n FROM txn WHERE id = ? AND status = ?", id, from);
    if (!before || toInt(before.n) === 0)
      return false;
    await this.db.run("UPDATE txn SET status = ?, reason = ? WHERE id = ?", to, reason, id);
    await this.#appendAudit("txn_status", id, { from, to, reason });
    return true;
  }
  async getTxn(id) {
    const t = await this.db.get("SELECT * FROM txn WHERE id = ? AND sealed = 1", id);
    if (!t)
      return null;
    const rows = await this.db.all(`SELECT p.*, a.code AS account_code, t.date AS txn_date, t.status AS txn_status
       FROM posting p JOIN account a ON a.id = p.account_id JOIN txn t ON t.id = p.txn_id
       WHERE p.txn_id = ? ORDER BY p.seq`, id);
    return { txn: mapTxn(t, rows), status: t.status };
  }
  async listTxns(q) {
    const { where, params } = buildWhere(q, "t");
    const limit = q.limit ? ` LIMIT ${toInt(q.limit)}` : "";
    const offset = q.offset ? ` OFFSET ${toInt(q.offset)}` : "";
    const ts = await this.db.all(`SELECT DISTINCT t.* FROM txn t WHERE ${where} ORDER BY t.date, t.id${limit}${offset}`, ...params);
    const out2 = [];
    for (const t of ts) {
      const got = await this.getTxn(t.id);
      if (got)
        out2.push(got);
    }
    return out2;
  }
  async *streamPostings(q) {
    const { where, params } = buildWhere(q, "t");
    const accountWhere = q.accountPrefix ? " AND (a.code = ? OR a.code GLOB ?)" : "";
    const accountParams = q.accountPrefix ? [q.accountPrefix, this.db.dialect.subtreeWildcard(q.accountPrefix)] : [];
    const idWhere = q.accountIds?.length ? ` AND p.account_id IN (${q.accountIds.map(() => "?").join(",")})` : "";
    const idParams = q.accountIds ? [...q.accountIds] : [];
    const rows = await this.db.all(`SELECT p.*, a.code AS account_code, t.date AS txn_date, t.status AS txn_status
       FROM posting p JOIN txn t ON t.id = p.txn_id JOIN account a ON a.id = p.account_id
       WHERE ${where}${accountWhere}${idWhere}
       ORDER BY t.date, t.id, p.seq`, ...params, ...accountParams, ...idParams);
    for (const r of rows) {
      yield {
        txnId: r.txn_id,
        txnDate: r.txn_date,
        txnStatus: r.txn_status,
        seq: toInt(r.seq),
        accountId: r.account_id,
        accountCode: r.account_code,
        unitsMinor: toBigInt(r.units_minor),
        commodity: r.commodity,
        weightMinor: toBigInt(r.weight_minor),
        weightSource: r.weight_source,
        kind: r.kind
      };
    }
  }
  /** The fast path. Must agree with foldBalances() over streamPostings(). */
  async getBalances(q) {
    const effective = q.asOf ? { ...q, to: q.asOf } : q;
    const { where, params } = buildWhere(effective, "t");
    const accountWhere = q.accountPrefix ? " AND (a.code = ? OR a.code GLOB ?)" : "";
    const accountParams = q.accountPrefix ? [q.accountPrefix, this.db.dialect.subtreeWildcard(q.accountPrefix)] : [];
    const idWhere = q.accountIds?.length ? ` AND p.account_id IN (${q.accountIds.map(() => "?").join(",")})` : "";
    const idParams = q.accountIds ? [...q.accountIds] : [];
    return (await this.db.all(`SELECT p.account_id, a.code AS account_code, p.commodity, SUM(p.units_minor) AS units, SUM(p.weight_minor) AS weight FROM posting p JOIN txn t ON t.id = p.txn_id JOIN account a ON a.id = p.account_id WHERE ${where}${accountWhere}${idWhere} GROUP BY p.account_id, a.code, p.commodity ORDER BY a.code, p.commodity`, ...params, ...accountParams, ...idParams)).map((r) => ({
      accountId: r.account_id,
      accountCode: r.account_code,
      commodity: r.commodity,
      unitsMinor: toBigInt(r.units),
      weightMinor: toBigInt(r.weight)
    }));
  }
  async listPeriods(filter) {
    const where = [];
    const params = [];
    if (filter?.grain) {
      where.push("grain = ?");
      params.push(filter.grain);
    }
    if (filter?.status) {
      where.push("status = ?");
      params.push(filter.status);
    }
    return (await this.db.all(`SELECT * FROM period ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY start`, ...params)).map((r) => ({
      id: r.id,
      grain: r.grain,
      start: r.start,
      end: r.end,
      status: r.status
    }));
  }
  async findPeriodFor(date, grain) {
    const r = await this.db.get("SELECT * FROM period WHERE grain = ? AND start <= ? AND end >= ?", grain, date, date);
    return r ? {
      id: r.id,
      grain: r.grain,
      start: r.start,
      end: r.end,
      status: r.status
    } : null;
  }
  async setPeriodStatus(id, s, meta) {
    await this.db.run("UPDATE period SET status = ? WHERE id = ?", s, id);
    await this.#appendAudit("period_status", id, { status: s, reason: meta.reason ?? null });
  }
  async listCards() {
    return (await this.db.all("SELECT * FROM card ORDER BY account_id")).map(mapCard);
  }
  async getCard(accountId) {
    const r = await this.db.get("SELECT * FROM card WHERE account_id = ?", accountId);
    return r ? mapCard(r) : null;
  }
  async upsertCard(c) {
    assertCardCycleRule(c.rule);
    const acct = await this.getAccount(c.accountId);
    if (!acct)
      throw new Error(`holiday: no such account: ${c.accountId}`);
    if (acct.type !== "liability") {
      throw new Error(`holiday: ${acct.code} is a ${acct.type} account \u2014 a card must be a liability`);
    }
    const funding = await this.getAccount(c.fundingAccountId);
    if (!funding)
      throw new Error(`holiday: no such funding account: ${c.fundingAccountId}`);
    if (funding.type !== "asset") {
      throw new Error(`holiday: ${funding.code} is a ${funding.type} account \u2014 a card is paid from an asset`);
    }
    await this.db.run(`INSERT INTO card (account_id, funding_account_id, cycle_close_day, payment_month_offset, payment_day, label)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(account_id) DO UPDATE SET
         funding_account_id = excluded.funding_account_id,
         cycle_close_day = excluded.cycle_close_day,
         payment_month_offset = excluded.payment_month_offset,
         payment_day = excluded.payment_day,
         label = excluded.label`, c.accountId, c.fundingAccountId, c.rule.cycleCloseDay, c.rule.paymentMonthOffset, c.rule.paymentDay, c.label);
    await this.#appendAudit("card_upsert", c.accountId, { rule: c.rule, fundingAccountId: c.fundingAccountId });
  }
  async listInstallments(filter) {
    const plans = await this.db.all("SELECT * FROM installment ORDER BY purchased_on, id");
    const out2 = [];
    for (const p of plans) {
      const rows = await this.#rowsOf(p.id);
      if (filter?.activeOn && !rows.some((r) => r.paymentDate > filter.activeOn))
        continue;
      out2.push({ plan: mapInstallment(p), rows });
    }
    return out2;
  }
  async getInstallment(id) {
    const p = await this.db.get("SELECT * FROM installment WHERE id = ?", id);
    return p ? { plan: mapInstallment(p), rows: await this.#rowsOf(id) } : null;
  }
  async #rowsOf(installmentId) {
    return (await this.db.all("SELECT * FROM installment_row WHERE installment_id = ? ORDER BY seq", installmentId)).map((r) => ({
      seq: toInt(r.seq),
      paymentDate: r.payment_date,
      principalMinor: toBigInt(r.principal_minor),
      feeMinor: toBigInt(r.fee_minor)
    }));
  }
  async upsertInstallment(plan, rows) {
    if (plan.cardAccountId === plan.liabilityAccountId) {
      throw new Error(`holiday: an installment's liability account must differ from the card account, or ordinary billing will count the whole purchase on the first bill`);
    }
    const principal = rows.reduce((s, r) => s + r.principalMinor, 0n);
    if (principal !== plan.totalMinor) {
      throw new Error(`holiday: schedule principal sums to ${principal} but the purchase was ${plan.totalMinor}`);
    }
    if (rows.some((r) => r.feeMinor < 0n)) {
      throw new Error("holiday: a \uD560\uBD80\uC218\uC218\uB8CC cannot be negative");
    }
    if (plan.interestFree && rows.some((r) => r.feeMinor !== 0n)) {
      throw new Error("holiday: plan is marked interest-free but has non-zero fees");
    }
    if (rows.length !== plan.months) {
      throw new Error(`holiday: plan says ${plan.months} months but got ${rows.length} rows`);
    }
    await this.db.run(`INSERT INTO installment (id, card_account_id, liability_account_id, txn_id, purchased_on,
                                months, total_minor, commodity, interest_free, label)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         card_account_id = excluded.card_account_id,
         liability_account_id = excluded.liability_account_id,
         txn_id = excluded.txn_id, purchased_on = excluded.purchased_on,
         months = excluded.months, total_minor = excluded.total_minor,
         commodity = excluded.commodity, interest_free = excluded.interest_free,
         label = excluded.label`, plan.id, plan.cardAccountId, plan.liabilityAccountId, plan.txnId, plan.purchasedOn, plan.months, plan.totalMinor, plan.commodity, plan.interestFree ? 1 : 0, plan.label);
    await this.db.run("DELETE FROM installment_row WHERE installment_id = ?", plan.id);
    for (const r of rows) {
      await this.db.run("INSERT INTO installment_row (installment_id, seq, payment_date, principal_minor, fee_minor) VALUES (?, ?, ?, ?, ?)", plan.id, r.seq, r.paymentDate, r.principalMinor, r.feeMinor);
    }
    await this.#appendAudit("installment_upsert", plan.id, {
      months: plan.months,
      totalMinor: plan.totalMinor.toString(),
      cardAccountId: plan.cardAccountId
    });
  }
  async listRecurring(filter) {
    const rows = (await this.db.all("SELECT * FROM recurring ORDER BY label, id")).map(mapRecurring);
    if (!filter?.activeOn)
      return rows;
    return rows.filter((r) => isActiveOn(r, filter.activeOn));
  }
  async upsertRecurring(r) {
    assertCadence(r.cadence);
    const expense = await this.getAccount(r.expenseAccountId);
    if (!expense)
      throw new Error(`holiday: no such account: ${r.expenseAccountId}`);
    const funding = await this.getAccount(r.fundingAccountId);
    if (!funding)
      throw new Error(`holiday: no such account: ${r.fundingAccountId}`);
    if (funding.type !== "asset" && funding.type !== "liability") {
      throw new Error(`holiday: ${funding.code} is a ${funding.type} account \u2014 a recurring expense is funded from an asset (direct debit) or a liability (card)`);
    }
    await this.db.run(`INSERT INTO recurring (id, label, expense_account_id, funding_account_id, amount_minor, commodity,
                              cadence_kind, day_of_month, month, active_from, active_to)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         label = excluded.label, expense_account_id = excluded.expense_account_id,
         funding_account_id = excluded.funding_account_id, amount_minor = excluded.amount_minor,
         commodity = excluded.commodity, cadence_kind = excluded.cadence_kind,
         day_of_month = excluded.day_of_month, month = excluded.month,
         active_from = excluded.active_from, active_to = excluded.active_to`, r.id, r.label, r.expenseAccountId, r.fundingAccountId, r.amountMinor, r.commodity, r.cadence.kind, r.cadence.dayOfMonth, r.cadence.kind === "yearly" ? r.cadence.month : null, r.activeFrom, r.activeTo);
    await this.#appendAudit("recurring_upsert", r.id, {
      label: r.label,
      amountMinor: r.amountMinor.toString(),
      cadence: r.cadence
    });
  }
  async listLoans() {
    const loans = await this.db.all("SELECT * FROM loan ORDER BY account_id");
    const out2 = [];
    for (const l of loans)
      out2.push({ loan: mapLoan(l), rows: await this.#loanRows(l.account_id) });
    return out2;
  }
  async getLoan(accountId) {
    const l = await this.db.get("SELECT * FROM loan WHERE account_id = ?", accountId);
    return l ? { loan: mapLoan(l), rows: await this.#loanRows(accountId) } : null;
  }
  async #loanRows(loanId) {
    return (await this.db.all("SELECT * FROM loan_schedule_row WHERE loan_id = ? ORDER BY seq", loanId)).map((r) => ({
      seq: toInt(r.seq),
      dueDate: r.due_date,
      openingMinor: toBigInt(r.opening_minor),
      principalMinor: toBigInt(r.principal_minor),
      interestMinor: toBigInt(r.interest_minor),
      closingMinor: toBigInt(r.closing_minor)
    }));
  }
  async upsertLoan(loan2, rows) {
    const acct = await this.getAccount(loan2.accountId);
    if (!acct)
      throw new Error(`holiday: no such account: ${loan2.accountId}`);
    if (acct.type !== "liability") {
      throw new Error(`holiday: ${acct.code} is a ${acct.type} account \u2014 a loan must be a liability`);
    }
    const funding = await this.getAccount(loan2.fundingAccountId);
    if (!funding || funding.type !== "asset") {
      throw new Error(`holiday: a loan is paid from an asset account`);
    }
    const interest = await this.getAccount(loan2.interestAccountId);
    if (!interest || interest.type !== "expense") {
      throw new Error(`holiday: loan interest must be booked to an expense account`);
    }
    if (loan2.method !== "interest_only") {
      const principal = schedulePrincipal(rows);
      if (principal !== loan2.principalMinor) {
        throw new Error(`holiday: schedule repays ${principal} but the loan is ${loan2.principalMinor}`);
      }
    }
    if (rows.length !== loan2.termMonths) {
      throw new Error(`holiday: loan says ${loan2.termMonths} months but got ${rows.length} rows`);
    }
    await this.db.run(`INSERT INTO loan (account_id, funding_account_id, interest_account_id, principal_minor, commodity,
                         annual_rate_text, method, term_months, first_payment_date, payment_day, label)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(account_id) DO UPDATE SET
         funding_account_id = excluded.funding_account_id,
         interest_account_id = excluded.interest_account_id,
         principal_minor = excluded.principal_minor, commodity = excluded.commodity,
         annual_rate_text = excluded.annual_rate_text, method = excluded.method,
         term_months = excluded.term_months, first_payment_date = excluded.first_payment_date,
         payment_day = excluded.payment_day, label = excluded.label`, loan2.accountId, loan2.fundingAccountId, loan2.interestAccountId, loan2.principalMinor, loan2.commodity, loan2.annualRateText, loan2.method, loan2.termMonths, loan2.firstPaymentDate, loan2.paymentDay, loan2.label);
    await this.db.run("DELETE FROM loan_schedule_row WHERE loan_id = ?", loan2.accountId);
    for (const r of rows) {
      await this.db.run(`INSERT INTO loan_schedule_row (loan_id, seq, due_date, opening_minor, principal_minor, interest_minor, closing_minor)
         VALUES (?, ?, ?, ?, ?, ?, ?)`, loan2.accountId, r.seq, r.dueDate, r.openingMinor, r.principalMinor, r.interestMinor, r.closingMinor);
    }
    await this.#appendAudit("loan_upsert", loan2.accountId, {
      method: loan2.method,
      principalMinor: loan2.principalMinor.toString(),
      annualRateText: loan2.annualRateText,
      termMonths: loan2.termMonths
    });
  }
  async listBalanceAssertions(filter) {
    const where = [];
    const params = [];
    if (filter?.from) {
      where.push("as_of >= ?");
      params.push(filter.from);
    }
    if (filter?.to) {
      where.push("as_of <= ?");
      params.push(filter.to);
    }
    return (await this.db.all(`SELECT * FROM balance_assertion ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY as_of, account_id`, ...params)).map((r) => ({
      id: r.id,
      accountId: r.account_id,
      asOf: r.as_of,
      commodity: r.commodity,
      expectedMinor: toBigInt(r.expected_minor),
      note: r.note,
      createdAt: r.created_at
    }));
  }
  async putBalanceAssertion(a) {
    await this.db.run(`INSERT INTO balance_assertion (id, account_id, as_of, commodity, expected_minor, note, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(account_id, as_of, commodity) DO UPDATE SET
         expected_minor = excluded.expected_minor, note = excluded.note, created_at = excluded.created_at`, a.id, a.accountId, a.asOf, a.commodity, a.expectedMinor, a.note, a.createdAt);
    await this.#appendAudit("assertion_put", a.accountId, { asOf: a.asOf, expectedMinor: a.expectedMinor.toString() });
  }
  async upsertPeriod(p) {
    await this.db.run(`INSERT INTO period (id, grain, start, end, status) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET status = excluded.status`, p.id, p.grain, p.start, p.end, p.status);
  }
  async getSnapshot(periodId, kind) {
    const s = await this.db.get("SELECT * FROM snapshot WHERE period_id = ? AND kind = ?", periodId, kind);
    if (!s)
      return null;
    const balances = (await this.db.all("SELECT * FROM snapshot_balance WHERE snapshot_id = ?", s.id)).map((b) => ({
      accountId: b.account_id,
      commodity: b.commodity,
      unitsMinor: toBigInt(b.units_minor),
      weightMinor: toBigInt(b.weight_minor),
      periodUnitsMinor: toBigInt(b.period_units_minor),
      periodWeightMinor: toBigInt(b.period_weight_minor)
    }));
    return { id: s.id, periodId: s.period_id, kind: s.kind, asOf: s.as_of, createdAt: s.created_at, balances };
  }
  async writeSnapshot(s) {
    await this.db.run(`INSERT INTO snapshot (id, period_id, kind, as_of, created_at) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(period_id, kind) DO UPDATE SET as_of = excluded.as_of, created_at = excluded.created_at`, s.id, s.periodId, s.kind, s.asOf, s.createdAt);
    await this.db.run("DELETE FROM snapshot_balance WHERE snapshot_id = ?", s.id);
    for (const b of s.balances) {
      await this.db.run(`INSERT INTO snapshot_balance (snapshot_id, account_id, commodity, units_minor, weight_minor, period_units_minor, period_weight_minor)
         VALUES (?, ?, ?, ?, ?, ?, ?)`, s.id, b.accountId, b.commodity, b.unitsMinor, b.weightMinor, b.periodUnitsMinor, b.periodWeightMinor);
    }
    await this.#appendAudit("snapshot_write", s.periodId, { kind: s.kind, accounts: s.balances.length });
  }
  async listFxRates(filter) {
    const where = [];
    const params = [];
    if (filter?.base) {
      where.push("base = ?");
      params.push(filter.base);
    }
    if (filter?.quote) {
      where.push("quote = ?");
      params.push(filter.quote);
    }
    if (filter?.to) {
      where.push("as_of <= ?");
      params.push(filter.to);
    }
    return (await this.db.all(`SELECT * FROM fx_rate ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY as_of DESC, base, quote`, ...params)).map((r) => ({
      id: r.id,
      asOf: r.as_of,
      base: r.base,
      quote: r.quote,
      rate: r.rate,
      source: r.source,
      fetchedAt: r.fetched_at
    }));
  }
  async putFxRates(rates) {
    let written = 0;
    for (const r of rates) {
      parseRate(r.rate);
      if (r.base === r.quote)
        throw new Error(`holiday: ${r.base}\u2192${r.quote} is not an exchange rate`);
      await this.db.run(`INSERT INTO fx_rate (id, as_of, base, quote, rate, source, fetched_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(as_of, base, quote, source) DO UPDATE SET
           rate = excluded.rate, fetched_at = excluded.fetched_at`, r.id, r.asOf, r.base, r.quote, r.rate, r.source, r.fetchedAt);
      written += 1;
    }
    if (written > 0)
      await this.#appendAudit("fx_put", `${written} rate(s)`, { count: written });
    return written;
  }
  async findIngestBatchBySha(sha) {
    const r = await this.db.get("SELECT * FROM ingest_batch WHERE source_sha256 = ?", sha);
    return r ? mapBatch(r) : null;
  }
  async findIngestItemsByDedupeKey(key) {
    return (await this.db.all("SELECT * FROM ingest_item WHERE dedupe_key = ? ORDER BY created_at", key)).map(mapItem);
  }
  async listIngestItems(filter) {
    const sql = filter?.status ? "SELECT * FROM ingest_item WHERE status = ? ORDER BY created_at" : "SELECT * FROM ingest_item ORDER BY created_at";
    const params = filter?.status ? [filter.status] : [];
    return (await this.db.all(sql, ...params)).map(mapItem);
  }
  async recordIngestBatch(b) {
    await this.db.run("INSERT INTO ingest_batch (id, source_sha256, source_name, submitted_at, item_count) VALUES (?, ?, ?, ?, ?)", b.id, b.sourceSha256, b.sourceName, b.submittedAt, b.itemCount);
  }
  async recordIngestItem(i) {
    await this.db.run(`INSERT INTO ingest_item (id, batch_id, dedupe_key, dedupe_authority, external_ref, merchant,
                                txn_id, status, reason, parsed_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, i.id, i.batchId, i.dedupeKey, i.dedupeAuthority, i.externalRef, i.merchant, i.txnId, i.status, i.reason, i.parsedJson, i.createdAt);
  }
  async setIngestItemStatus(id, status, meta) {
    await this.db.run("UPDATE ingest_item SET status = ?, reason = ?, txn_id = COALESCE(?, txn_id) WHERE id = ?", status, meta.reason ?? null, meta.txnId ?? null, id);
    await this.#appendAudit("ingest_item_status", id, { status, reason: meta.reason ?? null });
  }
  async getCommandResult(idemKey) {
    const r = await this.db.get("SELECT * FROM command_log WHERE idem_key = ?", idemKey);
    return r ? {
      idemKey: r.idem_key,
      requestSha256: r.request_sha256,
      responseJson: r.response_json,
      createdAt: r.created_at
    } : null;
  }
  async recordCommandResult(r) {
    const existing = await this.getCommandResult(r.idemKey);
    if (existing) {
      if (existing.requestSha256 !== r.requestSha256) {
        throw new Error(`holiday: idempotency key ${r.idemKey} was already used for a different request. Keys must be unique per distinct operation.`);
      }
      return;
    }
    await this.db.run("INSERT INTO command_log (idem_key, request_sha256, response_json, created_at) VALUES (?, ?, ?, ?)", r.idemKey, r.requestSha256, r.responseJson, r.createdAt);
  }
  /** Ring 4. Cheap here because it is just SQL — over a Notion-shaped store it would be an hour. */
  async verify() {
    const problems = [];
    for (const r of await this.db.all("SELECT txn_id, SUM(weight_minor) AS residual FROM posting GROUP BY txn_id HAVING SUM(weight_minor) <> 0")) {
      problems.push({
        kind: "unbalanced_txn",
        subject: r.txn_id,
        detail: `postings sum to ${r.residual}, expected 0`
      });
    }
    for (const r of await this.db.all(`SELECT p.txn_id, p.seq, p.units_minor, p.weight_minor
       FROM posting p JOIN txn t ON t.id = p.txn_id
       WHERE p.commodity = t.booking_commodity AND p.weight_minor <> p.units_minor`)) {
      problems.push({
        kind: "identity_weight",
        subject: `${r.txn_id}#${r.seq}`,
        detail: `booking-commodity posting has weight ${r.weight_minor} but units ${r.units_minor}`
      });
    }
    for (const r of await this.db.all(`SELECT p.txn_id, p.seq, p.commodity, a.commodity AS declared
       FROM posting p JOIN account a ON a.id = p.account_id
       WHERE a.commodity IS NOT NULL AND a.commodity <> p.commodity`)) {
      problems.push({
        kind: "commodity_conformance",
        subject: `${r.txn_id}#${r.seq}`,
        detail: `posting is ${r.commodity} but the account is declared ${r.declared}`
      });
    }
    for (const r of await this.db.all("SELECT id FROM txn WHERE sealed = 0")) {
      problems.push({
        kind: "unbalanced_txn",
        subject: r.id,
        detail: "transaction was never sealed \u2014 it was written but its balance was never asserted"
      });
    }
    problems.push(...await this.#verifyChain());
    const counted = await this.db.get("SELECT COUNT(*) AS n FROM txn");
    return { ok: problems.length === 0, checked: counted ? toInt(counted.n) : 0, problems };
  }
  /**
   * Walk the audit chain and recompute it.
   *
   * Two distinct failures live here. A broken link means an audit row itself was
   * altered. A content mismatch means the LEDGER was altered — the transaction
   * still balances (so every other check passes) but it no longer hashes to what
   * the chain recorded when it was written. That second one is the whole reason
   * the chain commits to content rather than to ids.
   */
  async #verifyChain() {
    const problems = [];
    const rows = await this.db.all("SELECT * FROM audit_log ORDER BY seq");
    let expectedPrev = GENESIS_HASH;
    for (const r of rows) {
      const seq = toInt(r.seq);
      if (r.prev_hash !== expectedPrev) {
        problems.push({
          kind: "chain_broken",
          subject: `audit#${seq}`,
          detail: `prev_hash is ${r.prev_hash} but the preceding row hashes to ${expectedPrev}`
        });
      }
      const recomputed = chainHash({
        seq,
        at: r.at,
        event: r.event,
        subject: r.subject,
        detail: r.detail,
        prevHash: r.prev_hash
      });
      if (recomputed !== r.hash) {
        problems.push({
          kind: "chain_broken",
          subject: `audit#${seq}`,
          detail: `row does not hash to its recorded value \u2014 it was altered after it was written`
        });
      }
      expectedPrev = r.hash;
      if (r.event === "txn_append") {
        const detail = JSON.parse(r.detail);
        if (detail.contentSha256) {
          const problem = await this.#verifyTxnContent(r.subject, detail.contentSha256, detail.hashVersion);
          if (problem)
            problems.push(problem);
        }
      }
    }
    return problems;
  }
  async #verifyTxnContent(txnId, expected, version) {
    const t = await this.db.get("SELECT * FROM txn WHERE id = ?", txnId);
    if (!t) {
      return {
        kind: "content_tampered",
        subject: txnId,
        detail: "the chain records this transaction but it is no longer in the ledger"
      };
    }
    const rows = await this.db.all(`SELECT p.*, a.code AS account_code, t.date AS txn_date, t.status AS txn_status
       FROM posting p JOIN account a ON a.id = p.account_id JOIN txn t ON t.id = p.txn_id
       WHERE p.txn_id = ? ORDER BY p.seq`, txnId);
    const actual = txnContentHash(mapTxn(t, rows), version ?? CHAIN_HASH_VERSION);
    if (actual !== expected) {
      return {
        kind: "content_tampered",
        subject: txnId,
        detail: `transaction content hashes to ${actual} but the audit chain recorded ${expected} \u2014 it balances, but it is not what was originally written`
      };
    }
    return null;
  }
};
async function chainHeadOf(db) {
  const head = await db.get("SELECT seq, hash FROM audit_log ORDER BY seq DESC LIMIT 1");
  return head ? { seq: toInt(head.seq), hash: head.hash } : null;
}
function mapBatch(r) {
  return {
    id: r.id,
    sourceSha256: r.source_sha256,
    sourceName: r.source_name,
    submittedAt: r.submitted_at,
    itemCount: toInt(r.item_count)
  };
}
function mapItem(r) {
  return {
    id: r.id,
    batchId: r.batch_id,
    dedupeKey: r.dedupe_key,
    dedupeAuthority: r.dedupe_authority,
    externalRef: r.external_ref,
    merchant: r.merchant,
    txnId: r.txn_id,
    status: r.status,
    reason: r.reason,
    parsedJson: r.parsed_json,
    createdAt: r.created_at
  };
}
function mapLoan(r) {
  return {
    accountId: r.account_id,
    fundingAccountId: r.funding_account_id,
    interestAccountId: r.interest_account_id,
    principalMinor: toBigInt(r.principal_minor),
    commodity: r.commodity,
    annualRateText: r.annual_rate_text,
    method: r.method,
    termMonths: toInt(r.term_months),
    firstPaymentDate: r.first_payment_date,
    paymentDay: toInt(r.payment_day),
    label: r.label
  };
}
function mapRecurring(r) {
  return {
    id: r.id,
    label: r.label,
    expenseAccountId: r.expense_account_id,
    fundingAccountId: r.funding_account_id,
    amountMinor: toBigInt(r.amount_minor),
    commodity: r.commodity,
    cadence: r.cadence_kind === "yearly" ? { kind: "yearly", month: toInt(r.month), dayOfMonth: toInt(r.day_of_month) } : { kind: "monthly", dayOfMonth: toInt(r.day_of_month) },
    activeFrom: r.active_from,
    activeTo: r.active_to
  };
}
function mapInstallment(r) {
  return {
    id: r.id,
    cardAccountId: r.card_account_id,
    liabilityAccountId: r.liability_account_id,
    txnId: r.txn_id,
    purchasedOn: r.purchased_on,
    months: toInt(r.months),
    totalMinor: toBigInt(r.total_minor),
    commodity: r.commodity,
    interestFree: toBool(r.interest_free),
    label: r.label
  };
}
function mapCard(r) {
  return {
    accountId: r.account_id,
    fundingAccountId: r.funding_account_id,
    rule: {
      cycleCloseDay: toInt(r.cycle_close_day),
      paymentMonthOffset: toInt(r.payment_month_offset),
      paymentDay: toInt(r.payment_day)
    },
    label: r.label
  };
}
function mapAccount(r) {
  return {
    id: r.id,
    code: r.code,
    type: r.type,
    parentId: r.parent_id,
    commodity: r.commodity,
    monetary: toBool(r.monetary),
    cash: toBool(r.cash),
    placeholder: toBool(r.placeholder),
    openedOn: r.opened_on,
    closedOn: r.closed_on
  };
}
function mapTxn(t, rows) {
  return Txn.trustFromStorage({
    id: t.id,
    date: t.date,
    bookingCommodity: t.booking_commodity,
    payee: t.payee,
    narration: t.narration,
    systemKind: t.system_kind,
    correctsTxnId: t.corrects_txn_id,
    sourceItemId: t.source_item_id,
    fxEstimated: toBool(t.fx_estimated),
    tags: JSON.parse(t.tags_json),
    meta: JSON.parse(t.meta_json),
    postings: rows.map((r) => ({
      seq: toInt(r.seq),
      accountId: r.account_id,
      units: { minor: toBigInt(r.units_minor), commodity: r.commodity },
      weightMinor: toBigInt(r.weight_minor),
      weightSource: r.weight_source,
      fxRateText: r.fx_rate_text,
      fxRateId: r.fx_rate_id,
      lotId: r.lot_id,
      kind: r.kind,
      memo: r.memo
    }))
  });
}
function buildWhere(q, alias) {
  const where = [`${alias}.sealed = 1`];
  const params = [];
  const statuses = q.statuses ?? ["posted"];
  where.push(`${alias}.status IN (${statuses.map(() => "?").join(",")})`);
  params.push(...statuses);
  if (q.from) {
    where.push(`${alias}.date >= ?`);
    params.push(q.from);
  }
  if (q.to) {
    where.push(`${alias}.date <= ?`);
    params.push(q.to);
  }
  return { where: where.join(" AND "), params };
}

// ../store-sqlite/dist/db.js
import { createRequire } from "node:module";
var DatabaseSync = createRequire(import.meta.url)("node:sqlite").DatabaseSync;
var Db = class {
  #db;
  #cache = /* @__PURE__ */ new Map();
  constructor(path) {
    this.#db = new DatabaseSync(path);
  }
  exec(sql) {
    this.#db.exec(sql);
  }
  prepare(sql) {
    const cached = this.#cache.get(sql);
    if (cached)
      return cached;
    const stmt = this.#db.prepare(sql);
    stmt.setReadBigInts(true);
    this.#cache.set(sql, stmt);
    return stmt;
  }
  run(sql, ...params) {
    this.prepare(sql).run(...params);
  }
  get(sql, ...params) {
    return this.prepare(sql).get(...params);
  }
  all(sql, ...params) {
    return this.prepare(sql).all(...params);
  }
  /**
   * IMMEDIATE, not DEFERRED: take the write lock up front so a concurrent writer
   * fails at BEGIN rather than at COMMIT, where the work is already done.
   */
  transaction(fn) {
    this.exec("BEGIN IMMEDIATE");
    try {
      const out2 = fn();
      this.exec("COMMIT");
      return out2;
    } catch (e) {
      try {
        this.exec("ROLLBACK");
      } catch {
      }
      throw e;
    }
  }
  close() {
    this.#cache.clear();
    this.#db.close();
  }
};

// ../store-sqlite/dist/driver.js
var SqliteDriver = class _SqliteDriver {
  db;
  dialect = {
    name: "sqlite",
    subtreeWildcard: (prefix) => `${prefix}:*`,
    prepare: (sql) => sql
  };
  #inTransaction = false;
  constructor(db) {
    this.db = db;
  }
  static open(path) {
    return new _SqliteDriver(new Db(path));
  }
  async get(sql, ...params) {
    return this.db.get(sql, ...params);
  }
  async all(sql, ...params) {
    return this.db.all(sql, ...params);
  }
  async run(sql, ...params) {
    this.db.run(sql, ...params);
  }
  async exec(sql) {
    this.db.exec(sql);
  }
  /**
   * IMMEDIATE, not DEFERRED: take the write lock up front so a concurrent writer
   * fails at BEGIN rather than at COMMIT, where the work is already done.
   *
   * Nested calls join the outer transaction rather than issuing a second BEGIN,
   * which SQLite rejects outright. The migration runner wraps each migration in
   * one of these, and seeding the book opens another inside migrate() — so the
   * nesting is real, not hypothetical.
   */
  async transaction(fn) {
    if (this.#inTransaction)
      return fn(this);
    this.db.exec("BEGIN IMMEDIATE");
    this.#inTransaction = true;
    try {
      const out2 = await fn(this);
      this.db.exec("COMMIT");
      return out2;
    } catch (e) {
      try {
        this.db.exec("ROLLBACK");
      } catch {
      }
      throw e;
    } finally {
      this.#inTransaction = false;
    }
  }
  async close() {
    this.db.close();
  }
};

// ../store-sqlite/dist/migrations.generated.js
var MIGRATIONS = [
  {
    "name": "20260717100240_init",
    "hash": "bb0945679071304270e05684c230172aee4157f064cbd23513200ed786c184fd",
    "statements": [
      'CREATE TABLE `account` (\n	`id` text PRIMARY KEY,\n	`code` text NOT NULL,\n	`type` text NOT NULL,\n	`parent_id` text,\n	`commodity` text,\n	`monetary` integer DEFAULT 1 NOT NULL,\n	`cash` integer DEFAULT 0 NOT NULL,\n	`placeholder` integer DEFAULT 0 NOT NULL,\n	`opened_on` text NOT NULL,\n	`closed_on` text,\n	CONSTRAINT `fk_account_commodity_commodity_code_fk` FOREIGN KEY (`commodity`) REFERENCES `commodity`(`code`),\n	CONSTRAINT "account_type_enum" CHECK("type" IN (\'asset\',\'liability\',\'equity\',\'income\',\'expense\')),\n	CONSTRAINT "account_monetary_bool" CHECK("monetary" IN (0,1)),\n	CONSTRAINT "account_cash_bool" CHECK("cash" IN (0,1)),\n	CONSTRAINT "account_placeholder_bool" CHECK("placeholder" IN (0,1))\n);',
      "CREATE TABLE `audit_log` (\n	`seq` integer PRIMARY KEY,\n	`at` text NOT NULL,\n	`event` text NOT NULL,\n	`subject` text NOT NULL,\n	`detail` text DEFAULT '{}' NOT NULL,\n	`prev_hash` text NOT NULL,\n	`hash` text NOT NULL UNIQUE\n);",
      "CREATE TABLE `book` (\n	`id` text PRIMARY KEY,\n	`schema_version` integer NOT NULL,\n	`functional_currency` text NOT NULL,\n	`close_grain` text DEFAULT 'month' NOT NULL,\n	`timezone` text DEFAULT 'Asia/Seoul' NOT NULL,\n	`dedupe_key_version` integer DEFAULT 1 NOT NULL,\n	`fx_max_staleness_days` integer DEFAULT 7 NOT NULL,\n	`created_at` text NOT NULL,\n	CONSTRAINT `fk_book_functional_currency_commodity_code_fk` FOREIGN KEY (`functional_currency`) REFERENCES `commodity`(`code`),\n	CONSTRAINT \"book_singleton\" CHECK(\"id\" = 'book'),\n	CONSTRAINT \"book_close_grain_enum\" CHECK(\"close_grain\" IN ('day','week','month','quarter','year'))\n);",
      'CREATE TABLE `card` (\n	`account_id` text PRIMARY KEY,\n	`funding_account_id` text NOT NULL,\n	`cycle_close_day` integer NOT NULL,\n	`payment_month_offset` integer NOT NULL,\n	`payment_day` integer NOT NULL,\n	`label` text,\n	CONSTRAINT `fk_card_account_id_account_id_fk` FOREIGN KEY (`account_id`) REFERENCES `account`(`id`),\n	CONSTRAINT `fk_card_funding_account_id_account_id_fk` FOREIGN KEY (`funding_account_id`) REFERENCES `account`(`id`),\n	CONSTRAINT "card_close_day_range" CHECK("cycle_close_day" BETWEEN 1 AND 31),\n	CONSTRAINT "card_offset_range" CHECK("payment_month_offset" BETWEEN 0 AND 3),\n	CONSTRAINT "card_payment_day_range" CHECK("payment_day" = -1 OR "payment_day" BETWEEN 1 AND 31)\n);',
      "CREATE TABLE `command_log` (\n	`idem_key` text PRIMARY KEY,\n	`request_sha256` text NOT NULL,\n	`response_json` text NOT NULL,\n	`created_at` text NOT NULL\n);",
      "CREATE TABLE `commodity` (\n	`code` text PRIMARY KEY,\n	`exponent` integer NOT NULL,\n	`kind` text NOT NULL,\n	`name` text NOT NULL,\n	CONSTRAINT \"commodity_exponent_range\" CHECK(\"exponent\" BETWEEN 0 AND 9),\n	CONSTRAINT \"commodity_kind_enum\" CHECK(\"kind\" IN ('fiat','crypto','security','unit'))\n);",
      "CREATE TABLE `fx_rate` (\n	`id` text PRIMARY KEY,\n	`as_of` text NOT NULL,\n	`base` text NOT NULL,\n	`quote` text NOT NULL,\n	`rate` text NOT NULL,\n	`source` text NOT NULL,\n	`fetched_at` text NOT NULL,\n	CONSTRAINT `fk_fx_rate_base_commodity_code_fk` FOREIGN KEY (`base`) REFERENCES `commodity`(`code`),\n	CONSTRAINT `fk_fx_rate_quote_commodity_code_fk` FOREIGN KEY (`quote`) REFERENCES `commodity`(`code`)\n);",
      'CREATE TABLE `installment` (\n	`id` text PRIMARY KEY,\n	`card_account_id` text NOT NULL,\n	`liability_account_id` text NOT NULL,\n	`txn_id` text,\n	`purchased_on` text NOT NULL,\n	`months` integer NOT NULL,\n	`total_minor` integer NOT NULL,\n	`commodity` text NOT NULL,\n	`interest_free` integer DEFAULT 1 NOT NULL,\n	`label` text,\n	CONSTRAINT `fk_installment_card_account_id_account_id_fk` FOREIGN KEY (`card_account_id`) REFERENCES `account`(`id`),\n	CONSTRAINT `fk_installment_liability_account_id_account_id_fk` FOREIGN KEY (`liability_account_id`) REFERENCES `account`(`id`),\n	CONSTRAINT `fk_installment_txn_id_txn_id_fk` FOREIGN KEY (`txn_id`) REFERENCES `txn`(`id`),\n	CONSTRAINT `fk_installment_commodity_commodity_code_fk` FOREIGN KEY (`commodity`) REFERENCES `commodity`(`code`),\n	CONSTRAINT "installment_months_positive" CHECK("months" >= 1),\n	CONSTRAINT "installment_total_positive" CHECK("total_minor" > 0),\n	CONSTRAINT "installment_accounts_differ" CHECK("card_account_id" <> "liability_account_id"),\n	CONSTRAINT "installment_interest_free_bool" CHECK("interest_free" IN (0,1))\n);',
      'CREATE TABLE `installment_row` (\n	`installment_id` text NOT NULL,\n	`seq` integer NOT NULL,\n	`payment_date` text NOT NULL,\n	`principal_minor` integer NOT NULL,\n	`fee_minor` integer DEFAULT 0 NOT NULL,\n	CONSTRAINT `installment_row_pk` PRIMARY KEY(`installment_id`, `seq`),\n	CONSTRAINT `fk_installment_row_installment_id_installment_id_fk` FOREIGN KEY (`installment_id`) REFERENCES `installment`(`id`) ON DELETE CASCADE,\n	CONSTRAINT "installment_row_seq_positive" CHECK("seq" >= 1)\n);',
      "CREATE TABLE `period` (\n	`id` text PRIMARY KEY,\n	`grain` text NOT NULL,\n	`start` text NOT NULL,\n	`end` text NOT NULL,\n	`status` text DEFAULT 'open' NOT NULL,\n	CONSTRAINT \"period_grain_enum\" CHECK(\"grain\" IN ('day','week','month','quarter','year')),\n	CONSTRAINT \"period_status_enum\" CHECK(\"status\" IN ('open','closed','locked'))\n);",
      "CREATE TABLE `posting` (\n	`txn_id` text NOT NULL,\n	`seq` integer NOT NULL,\n	`account_id` text NOT NULL,\n	`units_minor` integer NOT NULL,\n	`commodity` text NOT NULL,\n	`weight_minor` integer NOT NULL,\n	`weight_source` text NOT NULL,\n	`fx_rate_text` text,\n	`fx_rate_id` text,\n	`lot_id` text,\n	`kind` text DEFAULT 'normal' NOT NULL,\n	`memo` text,\n	CONSTRAINT `posting_pk` PRIMARY KEY(`txn_id`, `seq`),\n	CONSTRAINT `fk_posting_txn_id_txn_id_fk` FOREIGN KEY (`txn_id`) REFERENCES `txn`(`id`),\n	CONSTRAINT `fk_posting_account_id_account_id_fk` FOREIGN KEY (`account_id`) REFERENCES `account`(`id`),\n	CONSTRAINT `fk_posting_commodity_commodity_code_fk` FOREIGN KEY (`commodity`) REFERENCES `commodity`(`code`),\n	CONSTRAINT \"posting_weight_source_enum\" CHECK(\"weight_source\" IN ('identity','actual','rate','plug')),\n	CONSTRAINT \"posting_kind_enum\" CHECK(\"kind\" IN ('normal','fx_revaluation','rounding'))\n);",
      'CREATE TABLE `recurring` (\n	`id` text PRIMARY KEY,\n	`label` text NOT NULL,\n	`expense_account_id` text NOT NULL,\n	`funding_account_id` text NOT NULL,\n	`amount_minor` integer NOT NULL,\n	`commodity` text NOT NULL,\n	`cadence_kind` text NOT NULL,\n	`day_of_month` integer NOT NULL,\n	`month` integer,\n	`active_from` text NOT NULL,\n	`active_to` text,\n	CONSTRAINT `fk_recurring_expense_account_id_account_id_fk` FOREIGN KEY (`expense_account_id`) REFERENCES `account`(`id`),\n	CONSTRAINT `fk_recurring_funding_account_id_account_id_fk` FOREIGN KEY (`funding_account_id`) REFERENCES `account`(`id`),\n	CONSTRAINT `fk_recurring_commodity_commodity_code_fk` FOREIGN KEY (`commodity`) REFERENCES `commodity`(`code`),\n	CONSTRAINT "recurring_amount_positive" CHECK("amount_minor" > 0),\n	CONSTRAINT "recurring_cadence_enum" CHECK("cadence_kind" IN (\'monthly\',\'yearly\')),\n	CONSTRAINT "recurring_day_range" CHECK("day_of_month" = -1 OR "day_of_month" BETWEEN 1 AND 31),\n	CONSTRAINT "recurring_month_range" CHECK("month" IS NULL OR "month" BETWEEN 1 AND 12),\n	CONSTRAINT "recurring_yearly_needs_month" CHECK("cadence_kind" <> \'yearly\' OR "month" IS NOT NULL)\n);',
      "CREATE TABLE `txn` (\n	`id` text PRIMARY KEY,\n	`date` text NOT NULL,\n	`booking_commodity` text NOT NULL,\n	`payee` text,\n	`narration` text DEFAULT '' NOT NULL,\n	`status` text NOT NULL,\n	`system_kind` text,\n	`corrects_txn_id` text,\n	`source_item_id` text,\n	`fx_estimated` integer DEFAULT 0 NOT NULL,\n	`tags_json` text DEFAULT '[]' NOT NULL,\n	`meta_json` text DEFAULT '{}' NOT NULL,\n	`sealed` integer DEFAULT 0 NOT NULL,\n	`reason` text,\n	`created_at` text NOT NULL,\n	CONSTRAINT `fk_txn_booking_commodity_commodity_code_fk` FOREIGN KEY (`booking_commodity`) REFERENCES `commodity`(`code`),\n	CONSTRAINT \"txn_status_enum\" CHECK(\"status\" IN ('draft','posted','void','rejected')),\n	CONSTRAINT \"txn_system_kind_enum\" CHECK(\"system_kind\" IS NULL OR \"system_kind\" IN ('fx_revaluation','closing_entry','opening_balance')),\n	CONSTRAINT \"txn_fx_estimated_bool\" CHECK(\"fx_estimated\" IN (0,1)),\n	CONSTRAINT \"txn_sealed_bool\" CHECK(\"sealed\" IN (0,1))\n);",
      "CREATE INDEX `account_by_code` ON `account` (`code`);",
      "CREATE UNIQUE INDEX `fx_rate_unique` ON `fx_rate` (`as_of`,`base`,`quote`,`source`);",
      "CREATE INDEX `installment_by_card` ON `installment` (`card_account_id`);",
      "CREATE INDEX `installment_row_by_date` ON `installment_row` (`payment_date`);",
      "CREATE UNIQUE INDEX `period_grain_start` ON `period` (`grain`,`start`);",
      "CREATE INDEX `posting_by_account` ON `posting` (`account_id`);",
      "CREATE INDEX `recurring_by_funding` ON `recurring` (`funding_account_id`);",
      "CREATE INDEX `txn_by_date` ON `txn` (`date`,`id`);",
      "CREATE INDEX `txn_by_status` ON `txn` (`status`);"
    ]
  },
  {
    "name": "20260717100308_invariant_triggers",
    "hash": "a9ecf50df0f46efb91cf73a25a7e3f885c5cd1b8c8d2200ad17677d1b96527a6",
    "statements": [
      "-- Ring 3: invariants enforced at rest.\n--\n-- Hand-written because drizzle-kit models no triggers at all \u2014 its schema DSL has\n-- no trigger builder, and `generate` neither creates nor drops them. This is a\n-- `generate --custom` migration, which is what the Drizzle docs prescribe for\n-- \"DDL alternations currently not supported by Drizzle Kit\".\n--\n-- These exist to catch bugs in the domain, unsafe casts, and someone opening the\n-- file with the sqlite3 CLI. The domain is the authority; this is the backstop.\n-- Only an engine-tier store can offer this at all, which is a standing argument\n-- against ever making a Notion-shaped store the system of record.\n--\n-- WARNING for future migrations: drizzle-kit's SQLite ALTER strategy recreates a\n-- table (create new \u2192 copy \u2192 drop old \u2192 rename), and SQLite drops the triggers\n-- attached to a dropped table. Any migration that recreates `txn`, `posting`,\n-- `account`, `commodity`, or `audit_log` MUST re-create the relevant triggers\n-- below, or the invariants silently stop being enforced while every test still\n-- passes. `holiday verify` would still catch violations after the fact; nothing\n-- would stop them going in.\n\nCREATE TRIGGER txn_seal_requires_balance\nBEFORE UPDATE OF sealed ON txn\nWHEN NEW.sealed = 1 AND OLD.sealed = 0\nBEGIN\n  SELECT RAISE(ABORT, 'holiday: transaction has fewer than two postings')\n  WHERE (SELECT COUNT(*) FROM posting WHERE txn_id = NEW.id) < 2;\n\n  SELECT RAISE(ABORT, 'holiday: unbalanced transaction \u2014 postings must sum to exactly zero')\n  WHERE (SELECT COALESCE(SUM(weight_minor), 0) FROM posting WHERE txn_id = NEW.id) <> 0;\nEND;",
      "CREATE TRIGGER posting_rejects_placeholder_account\nBEFORE INSERT ON posting\nBEGIN\n  SELECT RAISE(ABORT, 'holiday: cannot post to a placeholder account')\n  WHERE (SELECT placeholder FROM account WHERE id = NEW.account_id) = 1;\nEND;",
      "-- The most likely real error in the whole system: the vision model reads '$' as\n-- '\u20A9' and posts USD into a KRW-only account. This is where it dies.\nCREATE TRIGGER posting_commodity_conformance\nBEFORE INSERT ON posting\nBEGIN\n  SELECT RAISE(ABORT, 'holiday: posting commodity does not match the account''s declared commodity')\n  WHERE (SELECT commodity FROM account WHERE id = NEW.account_id) IS NOT NULL\n    AND (SELECT commodity FROM account WHERE id = NEW.account_id) <> NEW.commodity;\nEND;",
      "CREATE TRIGGER posting_identity_weight\nBEFORE INSERT ON posting\nBEGIN\n  SELECT RAISE(ABORT, 'holiday: a posting already in the booking commodity must have weight = units')\n  WHERE NEW.commodity = (SELECT booking_commodity FROM txn WHERE id = NEW.txn_id)\n    AND NEW.weight_minor <> NEW.units_minor;\nEND;",
      "-- The journal is append-only. Once sealed, postings are facts.\nCREATE TRIGGER posting_immutable_insert\nBEFORE INSERT ON posting\nWHEN (SELECT sealed FROM txn WHERE id = NEW.txn_id) = 1\nBEGIN\n  SELECT RAISE(ABORT, 'holiday: cannot add a posting to a sealed transaction \u2014 write a correction instead');\nEND;",
      "CREATE TRIGGER posting_immutable_update\nBEFORE UPDATE ON posting\nWHEN (SELECT sealed FROM txn WHERE id = OLD.txn_id) = 1\nBEGIN\n  SELECT RAISE(ABORT, 'holiday: postings of a sealed transaction are immutable \u2014 write a correction instead');\nEND;",
      "CREATE TRIGGER posting_immutable_delete\nBEFORE DELETE ON posting\nWHEN (SELECT sealed FROM txn WHERE id = OLD.txn_id) = 1\nBEGIN\n  SELECT RAISE(ABORT, 'holiday: postings of a sealed transaction cannot be deleted \u2014 void or correct instead');\nEND;",
      "CREATE TRIGGER txn_never_unseals\nBEFORE UPDATE OF sealed ON txn\nWHEN OLD.sealed = 1 AND NEW.sealed = 0\nBEGIN\n  SELECT RAISE(ABORT, 'holiday: a sealed transaction cannot be unsealed');\nEND;",
      "-- An exponent change silently rescales every amount of that commodity. It is a\n-- migration, not an edit.\nCREATE TRIGGER commodity_exponent_immutable\nBEFORE UPDATE OF exponent ON commodity\nWHEN OLD.exponent <> NEW.exponent\n  AND EXISTS (SELECT 1 FROM posting WHERE commodity = OLD.code)\nBEGIN\n  SELECT RAISE(ABORT, 'holiday: cannot change the exponent of a commodity that has postings');\nEND;",
      "-- An audit log you can quietly edit is decoration.\nCREATE TRIGGER audit_log_immutable_update\nBEFORE UPDATE ON audit_log\nBEGIN\n  SELECT RAISE(ABORT, 'holiday: the audit log is append-only');\nEND;",
      "CREATE TRIGGER audit_log_immutable_delete\nBEFORE DELETE ON audit_log\nBEGIN\n  SELECT RAISE(ABORT, 'holiday: the audit log is append-only');\nEND;"
    ]
  },
  {
    "name": "20260717101844_loans",
    "hash": "c7f4ab6db56f82d1ab73cd0ca78f7f06a83c5b65461aa35ba71f2c46b2426016",
    "statements": [
      'CREATE TABLE `loan` (\n	`account_id` text PRIMARY KEY,\n	`funding_account_id` text NOT NULL,\n	`interest_account_id` text NOT NULL,\n	`principal_minor` integer NOT NULL,\n	`commodity` text NOT NULL,\n	`annual_rate_text` text NOT NULL,\n	`method` text NOT NULL,\n	`term_months` integer NOT NULL,\n	`first_payment_date` text NOT NULL,\n	`payment_day` integer NOT NULL,\n	`label` text,\n	CONSTRAINT `fk_loan_account_id_account_id_fk` FOREIGN KEY (`account_id`) REFERENCES `account`(`id`),\n	CONSTRAINT `fk_loan_funding_account_id_account_id_fk` FOREIGN KEY (`funding_account_id`) REFERENCES `account`(`id`),\n	CONSTRAINT `fk_loan_interest_account_id_account_id_fk` FOREIGN KEY (`interest_account_id`) REFERENCES `account`(`id`),\n	CONSTRAINT `fk_loan_commodity_commodity_code_fk` FOREIGN KEY (`commodity`) REFERENCES `commodity`(`code`),\n	CONSTRAINT "loan_principal_positive" CHECK("principal_minor" > 0),\n	CONSTRAINT "loan_term_positive" CHECK("term_months" >= 1),\n	CONSTRAINT "loan_method_enum" CHECK("method" IN (\'annuity\',\'equal_principal\',\'bullet\',\'interest_only\')),\n	CONSTRAINT "loan_payment_day_range" CHECK("payment_day" = -1 OR "payment_day" BETWEEN 1 AND 31),\n	CONSTRAINT "loan_accounts_differ" CHECK("account_id" <> "funding_account_id")\n);',
      'CREATE TABLE `loan_schedule_row` (\n	`loan_id` text NOT NULL,\n	`seq` integer NOT NULL,\n	`due_date` text NOT NULL,\n	`opening_minor` integer NOT NULL,\n	`principal_minor` integer NOT NULL,\n	`interest_minor` integer NOT NULL,\n	`closing_minor` integer NOT NULL,\n	CONSTRAINT `loan_schedule_row_pk` PRIMARY KEY(`loan_id`, `seq`),\n	CONSTRAINT `fk_loan_schedule_row_loan_id_loan_account_id_fk` FOREIGN KEY (`loan_id`) REFERENCES `loan`(`account_id`) ON DELETE CASCADE,\n	CONSTRAINT "loan_schedule_seq_positive" CHECK("seq" >= 1)\n);',
      "CREATE INDEX `loan_schedule_by_date` ON `loan_schedule_row` (`due_date`);"
    ]
  },
  {
    "name": "20260717105405_ingest",
    "hash": "dea47ca026d33031e905e65bf8dacbb1463de0dd1488f8763f6e774867189b4c",
    "statements": [
      'CREATE TABLE `ingest_batch` (\n	`id` text PRIMARY KEY,\n	`source_sha256` text NOT NULL UNIQUE,\n	`source_name` text,\n	`submitted_at` text NOT NULL,\n	`item_count` integer DEFAULT 0 NOT NULL,\n	CONSTRAINT "ingest_batch_count_nonneg" CHECK("item_count" >= 0)\n);',
      "CREATE TABLE `ingest_item` (\n	`id` text PRIMARY KEY,\n	`batch_id` text NOT NULL,\n	`dedupe_key` text NOT NULL,\n	`dedupe_authority` text NOT NULL,\n	`external_ref` text,\n	`merchant` text,\n	`txn_id` text,\n	`status` text DEFAULT 'pending' NOT NULL,\n	`reason` text,\n	`parsed_json` text NOT NULL,\n	`created_at` text NOT NULL,\n	CONSTRAINT `fk_ingest_item_batch_id_ingest_batch_id_fk` FOREIGN KEY (`batch_id`) REFERENCES `ingest_batch`(`id`) ON DELETE CASCADE,\n	CONSTRAINT `fk_ingest_item_txn_id_txn_id_fk` FOREIGN KEY (`txn_id`) REFERENCES `txn`(`id`),\n	CONSTRAINT \"ingest_item_status_enum\" CHECK(\"status\" IN ('pending','accepted','rejected')),\n	CONSTRAINT \"ingest_item_authority_enum\" CHECK(\"dedupe_authority\" IN ('image','external_ref','natural'))\n);",
      "CREATE INDEX `ingest_item_by_dedupe` ON `ingest_item` (`dedupe_key`);",
      "CREATE INDEX `ingest_item_by_batch` ON `ingest_item` (`batch_id`);"
    ]
  },
  {
    "name": "20260717112827_close",
    "hash": "a0fa3c8bef5f10c51f61bbd6f992481bbf7b6273d43406bccf7f581ee73e881c",
    "statements": [
      "CREATE TABLE `balance_assertion` (\n	`id` text PRIMARY KEY,\n	`account_id` text NOT NULL,\n	`as_of` text NOT NULL,\n	`commodity` text NOT NULL,\n	`expected_minor` integer NOT NULL,\n	`note` text,\n	`created_at` text NOT NULL,\n	CONSTRAINT `fk_balance_assertion_account_id_account_id_fk` FOREIGN KEY (`account_id`) REFERENCES `account`(`id`),\n	CONSTRAINT `fk_balance_assertion_commodity_commodity_code_fk` FOREIGN KEY (`commodity`) REFERENCES `commodity`(`code`)\n);",
      "CREATE TABLE `snapshot` (\n	`id` text PRIMARY KEY,\n	`period_id` text NOT NULL,\n	`kind` text NOT NULL,\n	`as_of` text NOT NULL,\n	`created_at` text NOT NULL,\n	CONSTRAINT `fk_snapshot_period_id_period_id_fk` FOREIGN KEY (`period_id`) REFERENCES `period`(`id`),\n	CONSTRAINT \"snapshot_kind_enum\" CHECK(\"kind\" IN ('close','checkpoint'))\n);",
      "CREATE TABLE `snapshot_balance` (\n	`snapshot_id` text NOT NULL,\n	`account_id` text NOT NULL,\n	`commodity` text NOT NULL,\n	`units_minor` integer NOT NULL,\n	`weight_minor` integer NOT NULL,\n	`period_units_minor` integer DEFAULT 0 NOT NULL,\n	`period_weight_minor` integer DEFAULT 0 NOT NULL,\n	CONSTRAINT `snapshot_balance_pk` PRIMARY KEY(`snapshot_id`, `account_id`, `commodity`),\n	CONSTRAINT `fk_snapshot_balance_snapshot_id_snapshot_id_fk` FOREIGN KEY (`snapshot_id`) REFERENCES `snapshot`(`id`) ON DELETE CASCADE,\n	CONSTRAINT `fk_snapshot_balance_account_id_account_id_fk` FOREIGN KEY (`account_id`) REFERENCES `account`(`id`),\n	CONSTRAINT `fk_snapshot_balance_commodity_commodity_code_fk` FOREIGN KEY (`commodity`) REFERENCES `commodity`(`code`)\n);",
      "CREATE UNIQUE INDEX `balance_assertion_unique` ON `balance_assertion` (`account_id`,`as_of`,`commodity`);",
      "CREATE INDEX `balance_assertion_by_date` ON `balance_assertion` (`as_of`);",
      "CREATE UNIQUE INDEX `snapshot_unique` ON `snapshot` (`period_id`,`kind`);"
    ]
  }
];

// ../store-sqlite/dist/schema.js
var SCHEMA_VERSION = 2;
var PRAGMAS = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 5000;
-- A personal ledger writes a few rows a day. Correctness beats throughput.
PRAGMA synchronous = FULL;
`;

// ../store-sqlite/dist/store.js
function sqliteEngine(path) {
  return {
    name: "sqlite",
    driver: SqliteDriver.open(path),
    migrations: MIGRATIONS,
    schemaVersion: SCHEMA_VERSION,
    // Pragmas are per-connection, so they are set on open and never migrated.
    init: async (d) => d.exec(PRAGMAS),
    // ledger.db is meant to be committed, and an un-checkpointed file can be
    // missing the most recent transactions — they are still sitting in the -wal
    // that git is (correctly) ignoring. A backup that silently omits last week is
    // worse than no backup.
    checkpoint: async (d) => d.exec("PRAGMA wal_checkpoint(TRUNCATE)")
  };
}
function sqliteLedgerStore(opts) {
  return new SqlLedgerStore({
    engine: sqliteEngine(opts.path),
    book: opts.book,
    ...opts.now ? { now: opts.now } : {}
  });
}

// src/workspace.ts
var DIR = ".holiday";
var NoWorkspaceError = class extends Error {
  constructor(from) {
    super(
      `no ${DIR}/ found in ${from} or any parent directory. Run \`holiday init\` in the repo where you keep your finances \u2014 a PRIVATE one.`
    );
    this.name = "NoWorkspaceError";
  }
};
function findWorkspace(from = process.cwd()) {
  let dir = resolve(from);
  for (; ; ) {
    if (existsSync(join(dir, DIR, "config.json"))) return join(dir, DIR);
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}
function requireWorkspace(from = process.cwd()) {
  const ws = findWorkspace(from);
  if (!ws) throw new NoWorkspaceError(from);
  return ws;
}
function readConfig(ws) {
  return JSON.parse(readFileSync(join(ws, "config.json"), "utf8"));
}
function createWorkspace(root, config) {
  const ws = join(root, DIR);
  mkdirSync(join(ws, "exports"), { recursive: true });
  writeFileSync(join(ws, "config.json"), `${JSON.stringify(config, null, 2)}
`);
  writeFileSync(
    join(ws, ".gitignore"),
    [
      "# ledger.db is the system of record and SHOULD be committed.",
      "# These two are transient. Run `holiday checkpoint` before committing.",
      "ledger.db-wal",
      "ledger.db-shm",
      "",
      "# Exports are derived. Regenerate with `holiday export`.",
      "exports/",
      ""
    ].join("\n")
  );
  return ws;
}
function openStore(ws) {
  const config = readConfig(ws);
  return sqliteLedgerStore({
    path: join(ws, "ledger.db"),
    book: {
      functionalCurrency: config.functionalCurrency,
      closeGrain: config.closeGrain,
      timezone: config.timezone
    }
  });
}
async function openLedger(ws) {
  const store = openStore(ws);
  await store.init();
  await store.migrate();
  return store;
}

// src/cli.ts
var REVISION_ROWS = external_exports.array(
  external_exports.object({
    seq: external_exports.number().int().min(1),
    paymentDate: external_exports.string(),
    principalMinor: external_exports.string().regex(/^-?\d+$/),
    feeMinor: external_exports.string().regex(/^\d+$/).optional()
  })
).min(1);
var nextUlid = createUlidFactory();
var registry = CommodityRegistry.from(WELL_KNOWN_COMMODITIES);
var amounts = new AmountFactory(registry);
var program2 = new Command();
program2.name("holiday").description("A double-entry CFO ledger for one person.").version("0.1.0");
program2.command("init").description("create a .holiday/ ledger in the current directory").requiredOption("--currency <code>", "functional currency, e.g. KRW").option("--close-grain <grain>", "the one hard-close grain (day|week|month|quarter|year)", "month").option("--timezone <tz>", "IANA timezone", "Asia/Seoul").action(async (o) => {
  const currency = registry.get(o.currency).code;
  const ws = createWorkspace(process.cwd(), {
    functionalCurrency: currency,
    closeGrain: o.closeGrain,
    timezone: o.timezone,
    store: "sqlite"
  });
  const store = await openLedger(ws);
  await store.unitOfWork(async (uow) => {
    for (const c of registry.all()) await uow.upsertCommodity(c);
  });
  await store.close();
  out({ workspace: ws, functionalCurrency: currency, closeGrain: o.closeGrain });
  note(`Ledger created at ${ws}`);
  note(`Commit ledger.db. Keep this repository PRIVATE \u2014 it is your money.`);
});
var account = program2.command("account").description("manage accounts");
account.command("add <code>").description("add an account, e.g. Assets:Bank:KB:Checking").option("--commodity <code>", "restrict to one commodity (recommended); omit for multi-commodity").option("--non-monetary", "exclude from FX revaluation (equipment, prepaid)", false).option("--cash", "spendable cash \u2014 `holiday cashflow` walks forward from these", false).option("--placeholder", "a grouping node that cannot be posted to", false).option("--opened <date>", "ISO date", today()).action(
  async (code, o) => {
    const ws = requireWorkspace();
    const store = await openLedger(ws);
    const c = assertAccountCode(code);
    const acct = {
      id: nextUlid(),
      code: c,
      type: accountTypeOf(c),
      parentId: null,
      commodity: o.commodity ? registry.get(o.commodity).code : null,
      monetary: !o.nonMonetary,
      cash: o.cash,
      placeholder: o.placeholder,
      openedOn: assertIsoDate(o.opened),
      closedOn: null
    };
    await store.unitOfWork((uow) => uow.upsertAccount(acct));
    await store.close();
    out({ id: acct.id, code: acct.code, type: acct.type, commodity: acct.commodity, cash: acct.cash });
    if (acct.type === "asset" && !o.cash) {
      note(`${code} is not marked --cash, so it is NOT counted in \`holiday cashflow\`.`);
    }
  }
);
account.command("list").description("list accounts").action(async () => {
  const ws = requireWorkspace();
  const store = await openLedger(ws);
  const accounts = await store.read((r) => r.listAccounts());
  await store.close();
  if (jsonMode()) return out(accounts);
  for (const a of accounts) {
    const tags = [a.cash ? "cash" : null, a.placeholder ? "placeholder" : null, a.monetary ? null : "non-monetary"].filter(Boolean).join(" ");
    note(`${a.code.padEnd(40)} ${(a.commodity ?? "(multi)").padEnd(8)} ${tags}`);
  }
});
program2.command("txn").description("\uAC70\uB798 \uAE30\uB85D").command("add").description("record a transaction").option("--date <date>", "ISO date", today()).option("--payee <name>").option("--narration <text>", "", "").requiredOption(
  "--leg <leg...>",
  "ACCOUNT AMOUNT COMMODITY [@@ TOTAL]. Repeatable. Must sum to zero in the functional currency."
).option("--draft", "record as a draft pending review", false).action(async (o) => {
  const ws = requireWorkspace();
  const config = readConfig(ws);
  const store = await openLedger(ws);
  const byCode = /* @__PURE__ */ new Map();
  for (const a of await store.read((r) => r.listAccounts())) byCode.set(a.code, a);
  const resolve2 = (code) => {
    const a = byCode.get(code);
    if (!a) throw new UsageError(`no such account: ${code}. Create it with \`holiday account add ${code}\`.`);
    return a;
  };
  const date = assertIsoDate(o.date);
  const derive = await makeDeriveWeight(store, config.functionalCurrency, date);
  const postings = o.leg.map((l) => parseLeg(l, amounts, config.functionalCurrency, resolve2, derive));
  const result = Txn.create({
    id: nextUlid(),
    date,
    bookingCommodity: config.functionalCurrency,
    payee: o.payee ?? null,
    narration: o.narration,
    postings
  });
  if (!result.ok) {
    await store.close();
    throw new LedgerError("unbalanced", result.error.map(describeTxnError).join("\n"));
  }
  await store.unitOfWork((uow) => uow.appendTxn(result.value, { status: o.draft ? "draft" : "posted" }));
  await store.close();
  out({ id: result.value.id, status: o.draft ? "draft" : "posted", fxEstimated: result.value.fxEstimated });
});
program2.command("balance").description("show balances").option("--as-of <date>", "ISO date").option("--account <prefix>", "restrict to a subtree, e.g. Assets").action(async (o) => {
  const ws = requireWorkspace();
  const config = readConfig(ws);
  const store = await openLedger(ws);
  const rows = await store.read(
    (r) => r.getBalances({
      ...o.asOf ? { asOf: assertIsoDate(o.asOf) } : {},
      ...o.account ? { accountPrefix: assertAccountPrefix(o.account) } : {}
    })
  );
  await store.close();
  if (jsonMode()) {
    return out(
      rows.map((r) => ({ ...r, unitsMinor: r.unitsMinor.toString(), weightMinor: r.weightMinor.toString() }))
    );
  }
  for (const r of rows) {
    const sign = BigInt(displaySignOf(accountTypeOf(r.accountCode)));
    const units = amounts.formatWithCode({ minor: r.unitsMinor * sign, commodity: r.commodity });
    const carrying = r.commodity === config.functionalCurrency ? "" : `  (${amounts.formatWithCode({ minor: r.weightMinor * sign, commodity: config.functionalCurrency })})`;
    note(`${r.accountCode.padEnd(40)} ${units.padStart(20)}${carrying}`);
  }
});
var card = program2.command("card").description("credit card billing cycles");
card.command("add <code>").description("attach a billing cycle to a card liability account").requiredOption("--funding <code>", "the asset account the bill is paid from").requiredOption("--close-day <n>", "day the cycle closes, inclusive. 31 = month end (clamps)", Number).requiredOption("--payment-day <n>", "day the bill is paid. -1 = last day of month", Number).option("--payment-month-offset <n>", "months from close to payment", Number, 1).option("--label <text>").action(
  async (code, o) => {
    const ws = requireWorkspace();
    const store = await openLedger(ws);
    await store.unitOfWork(async (uow) => {
      const acct = await uow.getAccount(code);
      if (!acct) throw new UsageError(`no such account: ${code}`);
      const funding = await uow.getAccount(o.funding);
      if (!funding) throw new UsageError(`no such account: ${o.funding}`);
      await uow.upsertCard({
        accountId: acct.id,
        fundingAccountId: funding.id,
        rule: assertCardCycleRule({
          cycleCloseDay: o.closeDay,
          paymentMonthOffset: o.paymentMonthOffset,
          paymentDay: o.paymentDay
        }),
        label: o.label ?? null
      });
    });
    await store.close();
    const dates = billingDatesFor(assertIsoDate(today()), {
      cycleCloseDay: o.closeDay,
      paymentMonthOffset: o.paymentMonthOffset,
      paymentDay: o.paymentDay
    });
    out({ card: code, funding: o.funding, example: { purchasedToday: today(), ...dates } });
    note(`A purchase today (${today()}) closes ${dates.closeDate} and takes cash on ${dates.paymentDate}.`);
  }
);
card.command("list").description("cards and their billing rules").action(async () => {
  const ws = requireWorkspace();
  const store = await openLedger(ws);
  const now = assertIsoDate(today());
  const result = await store.read(async (r) => {
    const accounts = new Map((await r.listAccounts()).map((a) => [a.id, a]));
    return (await r.listCards()).map((c) => ({
      card: c,
      code: accounts.get(c.accountId)?.code ?? "?",
      funding: accounts.get(c.fundingAccountId)?.code ?? "?",
      example: billingDatesFor(now, c.rule)
    }));
  });
  await store.close();
  if (jsonMode()) return out(result.map(({ card: c, code, funding }) => ({ ...c, code, funding })));
  if (result.length === 0) return note("no cards. Add one with `holiday card add`.");
  for (const { card: c, code, funding, example } of result) {
    const close = c.rule.cycleCloseDay === 31 ? "\uB9D0\uC77C" : `${c.rule.cycleCloseDay}\uC77C`;
    const pay = c.rule.paymentDay === -1 ? "\uB9D0\uC77C" : `${c.rule.paymentDay}\uC77C`;
    const when = c.rule.paymentMonthOffset === 0 ? "\uB2F9\uC6D4" : c.rule.paymentMonthOffset === 1 ? "\uC775\uC6D4" : `${c.rule.paymentMonthOffset}\uAC1C\uC6D4 \uD6C4`;
    note(`${(c.label ?? code).padEnd(20)} ${close} \uB9C8\uAC10 \u2192 ${when} ${pay} \uACB0\uC81C   \u2190 ${funding}`);
    note(`${"".padEnd(20)} a purchase today (${now}) takes cash on ${example.paymentDate}`);
  }
});
var installment = program2.command("installment").description("\uD560\uBD80 \u2014 a purchase split across N bills");
installment.command("add").description("record an installment purchase and build its schedule").requiredOption("--card <code>", "the card whose statement carries the rows").requiredOption("--expense <code>", "what you bought").requiredOption("--total <amount>", "the full purchase amount").requiredOption("--months <n>", "term", Number).option("--liability <code>", "installment balance account (default: <card>:Installment)").option("--date <date>", "purchase date", today()).option("--payee <name>").option("--label <text>").option("--remainder-on <first|last>", "which row absorbs the odd won", "first").option(
  "--fees <list>",
  "\uD560\uBD80\uC218\uC218\uB8CC per row, comma-separated, READ OFF THE STATEMENT. One per month. Omit if \uBB34\uC774\uC790."
).action(
  async (o) => {
    const ws = requireWorkspace();
    const config = readConfig(ws);
    const store = await openLedger(ws);
    const purchasedOn = assertIsoDate(o.date);
    const totalAmount = amounts.parse(o.total, config.functionalCurrency);
    const result = await store.unitOfWork(async (uow) => {
      const cardAccount = await uow.getAccount(o.card);
      if (!cardAccount) throw new UsageError(`no such account: ${o.card}`);
      const card2 = await uow.getCard(cardAccount.id);
      if (!card2) {
        throw new UsageError(
          `${o.card} has no billing cycle, so an installment's payment dates cannot be computed. Run \`holiday card add ${o.card} --funding <bank> --close-day <n> --payment-day <n>\` first.`
        );
      }
      const expense = await uow.getAccount(o.expense);
      if (!expense) throw new UsageError(`no such account: ${o.expense}`);
      const liabilityCode = o.liability ?? `${cardAccount.code}:Installment`;
      let liability = await uow.getAccount(liabilityCode);
      if (!liability) {
        liability = await uow.upsertAccount({
          id: nextUlid(),
          code: assertAccountCode(liabilityCode),
          type: accountTypeOf(assertAccountCode(liabilityCode)),
          parentId: cardAccount.id,
          commodity: cardAccount.commodity,
          monetary: true,
          cash: false,
          // a liability is never cash on hand
          placeholder: false,
          openedOn: purchasedOn,
          closedOn: null
        });
        note(`created ${liabilityCode} (installment balances are kept apart from ordinary card charges)`);
      }
      const fees = o.fees ? o.fees.split(",").map((f) => amounts.parse(f.trim(), config.functionalCurrency).minor) : void 0;
      const rows = buildInstallmentSchedule({
        purchasedOn,
        months: o.months,
        totalMinor: totalAmount.minor,
        cardRule: card2.rule,
        remainderOn: o.remainderOn === "last" ? "last" : "first",
        ...fees ? { fees } : {}
      });
      const txn = Txn.create({
        id: nextUlid(),
        date: purchasedOn,
        bookingCommodity: config.functionalCurrency,
        payee: o.payee ?? null,
        narration: o.label ?? `${o.months}\uAC1C\uC6D4 \uD560\uBD80`,
        postings: [
          { accountId: expense.id, units: totalAmount },
          { accountId: liability.id, units: { minor: -totalAmount.minor, commodity: totalAmount.commodity } }
        ]
      });
      if (!txn.ok) throw new LedgerError("unbalanced", txn.error.map(describeTxnError).join("\n"));
      await uow.appendTxn(txn.value, { status: "posted" });
      const id = nextUlid();
      await uow.upsertInstallment(
        {
          id,
          cardAccountId: cardAccount.id,
          liabilityAccountId: liability.id,
          txnId: txn.value.id,
          purchasedOn,
          months: o.months,
          totalMinor: totalAmount.minor,
          commodity: totalAmount.commodity,
          interestFree: !fees,
          label: o.label ?? null
        },
        rows
      );
      return { id, txnId: txn.value.id, rows };
    });
    await store.close();
    out({
      id: result.id,
      txnId: result.txnId,
      rows: result.rows.map((r) => ({
        seq: r.seq,
        paymentDate: r.paymentDate,
        amountMinor: (r.principalMinor + r.feeMinor).toString()
      }))
    });
    const feeTotal = result.rows.reduce((s2, r) => s2 + r.feeMinor, 0n);
    note(
      `${o.months}\uAC1C\uC6D4 ${feeTotal === 0n ? "\uBB34\uC774\uC790" : "\uC720\uC774\uC790"} \uD560\uBD80, ${amounts.format(totalAmount)} ${config.functionalCurrency}. First ${result.rows[0].paymentDate}, last ${result.rows.at(-1).paymentDate}.`
    );
    if (feeTotal > 0n) {
      note(`\uD560\uBD80\uC218\uC218\uB8CC \uD569\uACC4 ${amounts.format({ minor: feeTotal, commodity: totalAmount.commodity })} \u2014 \uBA85\uC138\uC11C\uC5D0\uC11C \uC77D\uC740 \uAC12 \uADF8\uB300\uB85C. \uACC4\uC0B0\uD558\uC9C0 \uC54A\uC74C.`);
    }
    note(`\uC2E4\uC81C \uBA85\uC138\uC11C\uC640 \uB2E4\uB974\uBA74 \`holiday installment revise ${result.id}\`\uB85C \uB36E\uC5B4\uC4F0\uC138\uC694.`);
  }
);
installment.command("revise <id>").description("overwrite a schedule with what the statement actually says").requiredOption(
  "--data <json>",
  'JSON array: [{"seq":1,"paymentDate":"2026-09-01","principalMinor":"100000","feeMinor":"5000"}, \u2026]. Read off the statement \u2014 this always wins over anything computed.'
).action(async (id, o) => {
  const ws = requireWorkspace();
  const store = await openLedger(ws);
  let parsed;
  try {
    parsed = JSON.parse(o.data);
  } catch (e) {
    throw new UsageError(`--data is not valid JSON: ${e.message}`);
  }
  const rows = REVISION_ROWS.parse(parsed).map((r) => ({
    seq: r.seq,
    paymentDate: assertIsoDate(r.paymentDate),
    principalMinor: BigInt(r.principalMinor),
    feeMinor: BigInt(r.feeMinor ?? "0")
  }));
  const result = await store.unitOfWork(async (uow) => {
    const existing = await uow.getInstallment(id);
    if (!existing) throw new UsageError(`no such installment: ${id}`);
    const revised = reviseSchedule(rows, existing.plan.totalMinor);
    const feeTotal = revised.reduce((s2, r) => s2 + r.feeMinor, 0n);
    await uow.upsertInstallment(
      { ...existing.plan, months: revised.length, interestFree: feeTotal === 0n },
      revised
    );
    return { revised, feeTotal, commodity: existing.plan.commodity };
  });
  await store.close();
  out({
    id,
    rows: result.revised.map((r) => ({
      seq: r.seq,
      paymentDate: r.paymentDate,
      principalMinor: r.principalMinor.toString(),
      feeMinor: r.feeMinor.toString()
    }))
  });
  note(
    `${result.revised.length}\uD68C\uCC28\uB85C \uB36E\uC5B4\uC37C\uC2B5\uB2C8\uB2E4. \uD560\uBD80\uC218\uC218\uB8CC \uD569\uACC4 ${amounts.format({ minor: result.feeTotal, commodity: result.commodity })}.`
  );
});
installment.command("list").description("installments with money still to move").action(async () => {
  const ws = requireWorkspace();
  const config = readConfig(ws);
  const store = await openLedger(ws);
  const now = assertIsoDate(today());
  const plans = await store.read((r) => r.listInstallments({ activeOn: now }));
  await store.close();
  if (jsonMode()) {
    return out(
      plans.map((p) => ({
        ...p.plan,
        totalMinor: p.plan.totalMinor.toString(),
        rows: p.rows.map((r) => ({ ...r, principalMinor: r.principalMinor.toString(), feeMinor: r.feeMinor.toString() }))
      }))
    );
  }
  for (const { plan, rows } of plans) {
    const remaining = rows.filter((r) => r.paymentDate > now);
    const left = remaining.reduce((s, r) => s + r.principalMinor + r.feeMinor, 0n);
    note(
      `${(plan.label ?? plan.id).padEnd(24)} ${amounts.format({ minor: plan.totalMinor, commodity: plan.commodity }).padStart(12)} / ${plan.months}\uAC1C\uC6D4   \uB0A8\uC740 ${remaining.length}\uD68C ${amounts.format({ minor: left, commodity: plan.commodity })}`
    );
  }
  if (plans.length === 0) note("no active installments.");
});
var recurring = program2.command("recurring").description("\uC815\uAE30\uC9C0\uCD9C \u2014 rent, subscriptions, insurance");
recurring.command("add <label>").description("register a recurring expense").requiredOption("--expense <code>", "what it pays for").requiredOption("--funding <code>", "a bank account (debits on the day) or a card (rides its cycle)").requiredOption("--amount <amount>").option("--day <n>", "day of month. -1 = last day (\uB9D0\uC77C)", Number, 1).option("--yearly <month>", "make it yearly, in this month (1-12)", Number).option("--from <date>", "active from", today()).option("--to <date>", "active until (omit for open-ended)").action(
  async (label, o) => {
    const ws = requireWorkspace();
    const config = readConfig(ws);
    const store = await openLedger(ws);
    const amount = amounts.parse(o.amount, config.functionalCurrency);
    const cadence = assertCadence(
      o.yearly === void 0 ? { kind: "monthly", dayOfMonth: o.day } : { kind: "yearly", month: o.yearly, dayOfMonth: o.day }
    );
    const id = nextUlid();
    const viaCard = await store.unitOfWork(async (uow) => {
      const expense = await uow.getAccount(o.expense);
      if (!expense) throw new UsageError(`no such account: ${o.expense}`);
      const funding = await uow.getAccount(o.funding);
      if (!funding) throw new UsageError(`no such account: ${o.funding}`);
      await uow.upsertRecurring({
        id,
        label,
        expenseAccountId: expense.id,
        fundingAccountId: funding.id,
        amountMinor: amount.minor,
        commodity: amount.commodity,
        cadence,
        activeFrom: assertIsoDate(o.from),
        activeTo: o.to ? assertIsoDate(o.to) : null
      });
      return funding.type === "liability" ? await uow.getCard(funding.id) : null;
    });
    await store.close();
    out({ id, label, amountMinor: amount.minor.toString(), cadence });
    if (viaCard) {
      const dates = billingDatesFor(assertIsoDate(today()), viaCard.rule);
      note(
        `${label}: ${amounts.format(amount)} ${config.functionalCurrency}, ${describeCadence(cadence)}, on ${o.funding}. Charged to the card \u2014 cash follows its cycle (a charge today would settle ${dates.paymentDate}).`
      );
    } else {
      note(
        `${label}: ${amounts.format(amount)} ${config.functionalCurrency}, ${describeCadence(cadence)}, debited directly from ${o.funding} on the day.`
      );
    }
  }
);
recurring.command("list").description("active recurring expenses").action(async () => {
  const ws = requireWorkspace();
  const config = readConfig(ws);
  const store = await openLedger(ws);
  const now = assertIsoDate(today());
  const result = await store.read(async (r) => {
    const items = await r.listRecurring({ activeOn: now });
    const accounts = new Map((await r.listAccounts()).map((a) => [a.id, a]));
    return items.map((i) => ({ item: i, funding: accounts.get(i.fundingAccountId)?.code ?? "?" }));
  });
  await store.close();
  if (jsonMode()) {
    return out(result.map(({ item }) => ({ ...item, amountMinor: item.amountMinor.toString() })));
  }
  let monthly = 0n;
  for (const { item, funding } of result) {
    if (item.cadence.kind === "monthly") monthly += item.amountMinor;
    note(
      `${item.label.padEnd(20)} ${amounts.format({ minor: item.amountMinor, commodity: item.commodity }).padStart(10)} ${describeCadence(item.cadence).padEnd(14)} ${funding}`
    );
  }
  if (result.length === 0) return note("no active recurring expenses.");
  note("");
  note(`monthly total: ${amounts.format({ minor: monthly, commodity: config.functionalCurrency })} ${config.functionalCurrency}`);
});
program2.command("assert <account> <amount>").description("\uC7A5\uBD80\uAC00 \uC774 \uB0A0\uC9DC\uC5D0 \uC815\uD655\uD788 \uC774\uB7AC\uB2E4\uACE0 \uB2E8\uC5B8\uD55C\uB2E4 \u2014 \uBA85\uC138\uC11C\uB97C \uBCF4\uACE0").option("--as-of <date>", "ISO date", today()).option("--commodity <code>", "\uACC4\uC815 \uD1B5\uD654").option("--note <text>").action(async (code, amountText, o) => {
  const ws = requireWorkspace();
  const config = readConfig(ws);
  const store = await openLedger(ws);
  const asOf = assertIsoDate(o.asOf);
  const result = await store.unitOfWork(async (uow) => {
    const acct = await uow.getAccount(code);
    if (!acct) throw new UsageError(`no such account: ${code}`);
    const commodity = o.commodity ?? acct.commodity ?? config.functionalCurrency;
    const expected = amounts.parse(amountText, commodity);
    await uow.putBalanceAssertion({
      id: nextUlid(),
      accountId: acct.id,
      asOf,
      commodity: expected.commodity,
      expectedMinor: expected.minor,
      note: o.note ?? null,
      createdAt: nowIso()
    });
    const balances = await uow.getBalances({ asOf, accountIds: [acct.id] });
    const actual = balances.filter((b) => b.commodity === expected.commodity).reduce((sum, b) => sum + b.unitsMinor, 0n);
    const signed = acct.type === "liability" || acct.type === "equity" || acct.type === "income" ? -actual : actual;
    return { ...checkAssertion(expected.minor, signed), expected, actual: signed, code: acct.code };
  });
  await store.close();
  const money = (m) => amounts.formatWithCode({ minor: m, commodity: result.expected.commodity });
  out({ account: result.code, asOf, expectedMinor: result.expected.minor.toString(), actualMinor: result.actual.toString(), deltaMinor: result.deltaMinor.toString(), ok: result.ok });
  if (result.ok) {
    note(`\u2713 ${result.code} (${asOf}) = ${money(result.expected.minor)}`);
    return;
  }
  note(`\u26A0 ${result.code} (${asOf})`);
  note(`   \uBA85\uC138\uC11C: ${money(result.expected.minor).padStart(18)}`);
  note(`   \uC7A5\uBD80:   ${money(result.actual).padStart(18)}`);
  note(`   \uCC28\uC774:   ${money(result.deltaMinor).padStart(18)}`);
  note(`   \uB193\uCE5C \uAC70\uB798, \uC624\uB3C5\uD55C \uAE08\uC561, \uB610\uB294 \uC911\uBCF5\uC785\uB2C8\uB2E4. \uB9C8\uAC10\uC740 \uC774\uAC8C \uB9DE\uC744 \uB54C\uAE4C\uC9C0 \uB9C9\uD799\uB2C8\uB2E4.`);
  throw new LedgerError("assertion_failed", `${result.code} disagrees with the ledger by ${result.deltaMinor}`);
});
program2.command("close <month>").description("\uC6D4 \uB9C8\uAC10 \u2014 FX \uC7AC\uD3C9\uAC00, \uC2A4\uB0C5\uC0F7, \uC800\uB110 \uC7A0\uAE08").option("--dry-run", "\uBB34\uC5C7\uC774 \uC77C\uC5B4\uB0A0\uC9C0\uB9CC \uBCF4\uC5EC\uC900\uB2E4", false).action(async (month, o) => {
  const ws = requireWorkspace();
  const config = readConfig(ws);
  const store = await openLedger(ws);
  const bounds = monthBounds(month);
  const plan = await store.read(async (r) => {
    const book = await r.getBook();
    if (book.closeGrain !== "month") {
      throw new UsageError(`this book hard-closes by ${book.closeGrain}, not month`);
    }
    const accounts = await r.listAccounts();
    const byId = new Map(accounts.map((a) => [a.id, a]));
    const drafts = await r.listTxns({ from: bounds.start, to: bounds.end, statuses: ["draft"] });
    const assertions = await r.listBalanceAssertions({ from: bounds.start, to: bounds.end });
    const checks = [];
    for (const a of assertions) {
      const acct = byId.get(a.accountId);
      if (!acct) continue;
      const bal = await r.getBalances({ asOf: a.asOf, accountIds: [a.accountId] });
      const raw = bal.filter((b) => b.commodity === a.commodity).reduce((s2, b) => s2 + b.unitsMinor, 0n);
      const signed = acct.type === "liability" || acct.type === "equity" || acct.type === "income" ? -raw : raw;
      checks.push({
        accountCode: acct.code,
        asOf: a.asOf,
        commodity: a.commodity,
        expectedMinor: a.expectedMinor,
        actualMinor: signed,
        ...checkAssertion(a.expectedMinor, signed)
      });
    }
    const balances = await r.getBalances({ asOf: bounds.end });
    const rates = await r.listFxRates({ to: bounds.end });
    const revalInputs = [];
    for (const b of balances) {
      const acct = byId.get(b.accountId);
      if (!acct || b.commodity === config.functionalCurrency) continue;
      if (acct.type !== "asset" && acct.type !== "liability") continue;
      if (!acct.monetary) continue;
      if (b.unitsMinor === 0n) {
        if (b.weightMinor !== 0n) {
          revalInputs.push({
            accountId: b.accountId,
            accountCode: b.accountCode,
            commodity: b.commodity,
            unitsMinor: 0n,
            carryingMinor: b.weightMinor,
            targetMinor: 0n
          });
        }
        continue;
      }
      const resolved = resolveRate(rates, {
        base: b.commodity,
        quote: config.functionalCurrency,
        asOf: bounds.end,
        maxStalenessDays: book.fxMaxStalenessDays,
        functional: config.functionalCurrency
      });
      revalInputs.push({
        accountId: b.accountId,
        accountCode: b.accountCode,
        commodity: b.commodity,
        unitsMinor: b.unitsMinor,
        carryingMinor: b.weightMinor,
        targetMinor: convert(b.unitsMinor, resolved.rate, registry.exponentOf(b.commodity), registry.exponentOf(config.functionalCurrency))
      });
    }
    return { gate: closeGate(drafts.length, checks), lines: revaluationLines(revalInputs), balances, assertionCount: assertions.length };
  });
  if (!plan.gate.ok) {
    await store.close();
    note(plan.gate.explanation);
    throw new LedgerError("close_blocked", `${month} cannot close`);
  }
  const money = (m) => amounts.format({ minor: m, commodity: config.functionalCurrency });
  if (o.dryRun) {
    await store.close();
    out({ month, wouldRevalue: plan.lines.length, assertions: plan.assertionCount, dryRun: true });
    note(`${month} \uB9C8\uAC10 \uAC00\uB2A5. \uB2E8\uC5B8 ${plan.assertionCount}\uAC74 \uD1B5\uACFC.`);
    for (const l of plan.lines) note(`  \uC7AC\uD3C9\uAC00 ${l.accountCode.padEnd(30)} ${money(l.deltaMinor).padStart(14)} KRW`);
    if (plan.lines.length === 0) note("  \uC7AC\uD3C9\uAC00\uD560 \uC678\uD654 \uACC4\uC815 \uC5C6\uC74C.");
    return;
  }
  const result = await store.unitOfWork(async (uow) => {
    let txnId = null;
    if (plan.lines.length > 0) {
      const fxAccount = await uow.getAccount("Income:FX:Unrealized");
      if (!fxAccount) {
        throw new UsageError(
          `\uC7AC\uD3C9\uAC00\uC5D0\uB294 Income:FX:Unrealized \uACC4\uC815\uC774 \uD544\uC694\uD569\uB2C8\uB2E4. \`holiday account add Income:FX:Unrealized --commodity ${config.functionalCurrency}\``
        );
      }
      const total = plan.lines.reduce((s2, l) => s2 + l.deltaMinor, 0n);
      const txn = Txn.create({
        id: nextUlid(),
        date: bounds.end,
        bookingCommodity: config.functionalCurrency,
        narration: `${month} FX \uC7AC\uD3C9\uAC00`,
        systemKind: "fx_revaluation",
        postings: [
          // units = 0, weight ≠ 0. Changes the KRW carrying value without
          // touching the foreign balance — only expressible because weight is
          // stored rather than derived from units × rate.
          ...plan.lines.map((l) => ({
            accountId: l.accountId,
            units: amounts.fromMinor(0n, l.commodity),
            weightMinor: l.deltaMinor,
            weightSource: "actual",
            kind: "fx_revaluation"
          })),
          { accountId: fxAccount.id, units: amounts.fromMinor(-total, config.functionalCurrency) }
        ]
      });
      if (!txn.ok) throw new LedgerError("unbalanced", txn.error.map(describeTxnError).join("\n"));
      await uow.appendTxn(txn.value, { status: "posted" });
      txnId = txn.value.id;
    }
    await uow.upsertPeriod({ id: bounds.id, grain: "month", start: bounds.start, end: bounds.end, status: "open" });
    const closing = await uow.getBalances({ asOf: bounds.end });
    const opening = await uow.getBalances({ asOf: bounds.start, to: bounds.start });
    const openingBy = new Map(opening.map((b) => [`${b.accountId}|${b.commodity}`, b]));
    const balances = closing.map((b) => {
      const o2 = openingBy.get(`${b.accountId}|${b.commodity}`);
      return {
        accountId: b.accountId,
        commodity: b.commodity,
        unitsMinor: b.unitsMinor,
        weightMinor: b.weightMinor,
        periodUnitsMinor: b.unitsMinor - (o2?.unitsMinor ?? 0n),
        periodWeightMinor: b.weightMinor - (o2?.weightMinor ?? 0n)
      };
    });
    await uow.writeSnapshot({
      id: nextUlid(),
      periodId: bounds.id,
      kind: "close",
      asOf: bounds.end,
      createdAt: nowIso(),
      balances
    });
    await uow.setPeriodStatus(bounds.id, "closed", { reason: `close ${month}` });
    return { txnId, accounts: balances.length };
  });
  await store.close();
  out({ month, closed: true, revaluationTxnId: result.txnId, snapshotAccounts: result.accounts });
  note(`${month} \uB9C8\uAC10. \uC2A4\uB0C5\uC0F7 ${result.accounts}\uAC1C \uACC4\uC815.`);
  for (const l of plan.lines) note(`  \uC7AC\uD3C9\uAC00 ${l.accountCode.padEnd(30)} ${money(l.deltaMinor).padStart(14)} KRW`);
  if (plan.assertionCount === 0) {
    note(`  \u26A0 \uC774 \uAE30\uAC04\uC5D0 \uC794\uACE0 \uB2E8\uC5B8\uC774 \uC5C6\uC5C8\uC2B5\uB2C8\uB2E4. \uBA85\uC138\uC11C\uC640 \uB300\uC870\uB418\uC9C0 \uC54A\uC740 \uB2EC\uC740 \uC5BC\uB9B0 \uAC83\uC774\uC9C0 \uB9C8\uAC10\uD55C \uAC8C \uC544\uB2D9\uB2C8\uB2E4.`);
  }
});
var fx = program2.command("fx").description("\uD658\uC728 \u2014 \uC808\uB300 \uACFC\uAC70\uB97C \uBC14\uAFB8\uC9C0 \uC54A\uB294\uB2E4");
fx.command("add <base> <quote> <rate>").description("record a rate. 1 <base> = <rate> <quote>.").requiredOption("--as-of <date>", "the date this rate is for").option("--source <name>", "where it came from", "manual").action(async (base, quote, rateText, o) => {
  const ws = requireWorkspace();
  const store = await openLedger(ws);
  const asOf = assertIsoDate(o.asOf);
  const b = registry.get(base).code;
  const qc = registry.get(quote).code;
  const written = await store.unitOfWork(
    (uow) => uow.putFxRates([
      { id: nextUlid(), asOf, base: b, quote: qc, rate: rateText, source: o.source, fetchedAt: nowIso() }
    ])
  );
  await store.close();
  out({ base: b, quote: qc, rate: rateText, asOf, source: o.source, written });
  note(`1 ${b} = ${rateText} ${qc} (${asOf}, ${o.source})`);
  note(`\uC774\uBBF8 \uAE30\uD45C\uB41C weight\uB294 \uBC14\uB00C\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4. \uD658\uC728\uC740 \uC55E\uC73C\uB85C\uC758 \uC720\uB3C4\uC640 \uC7AC\uD3C9\uAC00\uC5D0\uB9CC \uC4F0\uC785\uB2C8\uB2E4.`);
});
fx.command("list").description("rates on file").option("--base <code>").option("--quote <code>").action(async (o) => {
  const ws = requireWorkspace();
  const store = await openLedger(ws);
  const rates = await store.read(
    (r) => r.listFxRates({
      ...o.base ? { base: registry.get(o.base).code } : {},
      ...o.quote ? { quote: registry.get(o.quote).code } : {}
    })
  );
  await store.close();
  if (jsonMode()) return out(rates);
  if (rates.length === 0) return note("\uD658\uC728\uC774 \uC5C6\uC2B5\uB2C8\uB2E4. `holiday fx add USD KRW 1333.33 --as-of <date>`");
  for (const r of rates) note(`${r.asOf}  1 ${r.base} = ${r.rate.padStart(12)} ${r.quote}   ${r.source}`);
});
fx.command("show <base> <quote>").description("which rate would be used, and why").option("--as-of <date>", "ISO date", today()).action(async (base, quote, o) => {
  const ws = requireWorkspace();
  const config = readConfig(ws);
  const store = await openLedger(ws);
  const asOf = assertIsoDate(o.asOf);
  const result = await store.read(async (r) => {
    const book = await r.getBook();
    const rates = await r.listFxRates({ to: asOf });
    return resolveRate(rates, {
      base: registry.get(base).code,
      quote: registry.get(quote).code,
      asOf,
      maxStalenessDays: book.fxMaxStalenessDays,
      functional: config.functionalCurrency
    });
  });
  await store.close();
  out({ kind: result.kind, rate: formatRate(result.rate), asOf: result.asOf, rateIds: result.rateIds });
  note(`1 ${base} = ${formatRate(result.rate)} ${quote}`);
  note(`  ${result.kind} \u2014 ${result.explanation}`);
});
var ingest = program2.command("ingest").description("\uCEA1\uCCD0\uC5D0\uC11C \uC77D\uC740 \uAC70\uB798\uB97C \uC6D0\uC7A5\uC5D0 \uB123\uAE30");
ingest.command("submit").description("record parsed transactions as DRAFTS for review. Never does OCR \u2014 you are the parser.").requiredOption("--data <submission>", "see the schema in src/ingest.ts. Legs, not a flat amount.").option("--image <path>", "the screenshot, so the same file cannot be ingested twice").option("--idem-key <key>", "retry-safe. Same key + same request replays the stored result.").action(async (o) => {
  const ws = requireWorkspace();
  const config = readConfig(ws);
  const store = await openLedger(ws);
  let parsed;
  try {
    parsed = JSON.parse(o.data);
  } catch (e) {
    throw new UsageError(`--data is not valid JSON: ${e.message}`);
  }
  const submission = INGEST_SUBMISSION.parse(parsed);
  let sourceSha = submission.sourceSha256 ?? null;
  if (o.image) {
    const { readFile } = await import("node:fs/promises");
    sourceSha = await sha256Bytes(new Uint8Array(await readFile(o.image)));
  }
  const requestSha = await sha256(o.data);
  const replay = o.idemKey ? await store.read((r) => r.getCommandResult(o.idemKey)) : null;
  if (replay) {
    await store.close();
    if (replay.requestSha256 !== requestSha) {
      throw new UsageError(
        `idem-key ${o.idemKey} was already used for a DIFFERENT request. Keys are per operation.`
      );
    }
    note("(replayed \u2014 this exact submission already ran)");
    process.stdout.write(`${replay.responseJson}
`);
    return;
  }
  const result = await store.unitOfWork(async (uow) => {
    if (sourceSha) {
      const seen = await uow.findIngestBatchBySha(sourceSha);
      if (seen) {
        throw new LedgerError(
          "duplicate_image",
          `this exact image was already ingested on ${seen.submittedAt} (${seen.itemCount} item(s)). Dropping the same file twice is always a mistake.`
        );
      }
    }
    const accounts = await uow.listAccounts();
    const byCode = new Map(accounts.map((a) => [a.code, a]));
    const byId = new Map(accounts.map((a) => [a.id, a]));
    const resolve2 = (code) => {
      const a = byCode.get(code);
      if (!a) throw new UsageError(`no such account: ${code}. Create it before ingesting.`);
      return a;
    };
    const existing = [];
    for await (const p of uow.streamPostings({ from: addMonthsIso(today(), -2) })) {
      const t = await uow.getTxn(p.txnId);
      existing.push({
        txnId: p.txnId,
        accountId: p.accountId,
        date: p.txnDate,
        unitsMinor: p.unitsMinor,
        commodity: p.commodity,
        merchant: t?.txn.payee ?? null
      });
    }
    const batchId = nextUlid();
    await uow.recordIngestBatch({
      id: batchId,
      sourceSha256: sourceSha ?? `no-image:${batchId}`,
      sourceName: submission.sourceName ?? (o.image ? o.image.split("/").at(-1) : null),
      submittedAt: nowIso(),
      itemCount: submission.items.length
    });
    const out2 = [];
    for (const item of submission.items) {
      const postings = item.legs.map(
        (l) => parseLeg(
          `${l.account} ${l.amount} ${l.commodity}${l.weight ? ` @@ ${l.weight}` : ""}`,
          amounts,
          config.functionalCurrency,
          resolve2
        )
      );
      const txn = Txn.create({
        id: nextUlid(),
        date: assertIsoDate(item.date),
        bookingCommodity: config.functionalCurrency,
        payee: item.payee ?? null,
        narration: item.narration ?? "",
        sourceItemId: batchId,
        postings
      });
      if (!txn.ok) throw new LedgerError("unbalanced", txn.error.map(describeTxnError).join("\n"));
      const moneyLeg = pickMoneyLeg(txn.value.postings, byId, item);
      const candidate = {
        accountId: moneyLeg.accountId,
        date: assertIsoDate(item.date),
        unitsMinor: moneyLeg.units.minor,
        commodity: moneyLeg.units.commodity,
        merchant: item.payee ?? null,
        externalRef: item.externalRef ?? null
      };
      const { key, authority } = await dedupeKey(candidate);
      const priorItems = await uow.findIngestItemsByDedupeKey(key);
      if (authority === "external_ref" && priorItems.length > 0) {
        throw new LedgerError(
          "duplicate_external_ref",
          `transaction ${item.externalRef} is already ingested (item ${priorItems[0].id}, ${priorItems[0].status}). The issuer's id says this is the same transaction.`
        );
      }
      const near = findNearDuplicates(candidate, existing);
      const warnings = near.map(
        (n) => `possible duplicate of ${n.txnId} (${n.date}, ${n.merchant ?? "?"}): ${n.reason}`
      );
      if (authority === "natural" && priorItems.length > 0) {
        warnings.push(
          `an earlier ingest had the same account, date, amount and merchant (item ${priorItems[0].id}) \u2014 but two identical purchases in a day are real, so this is only a warning`
        );
      }
      await uow.appendTxn(txn.value, { status: "draft" });
      const itemId = nextUlid();
      await uow.recordIngestItem({
        id: itemId,
        batchId,
        dedupeKey: key,
        dedupeAuthority: authority,
        externalRef: item.externalRef ?? null,
        merchant: item.payee ?? null,
        txnId: txn.value.id,
        status: "pending",
        reason: null,
        // Verbatim, so a misread has an audit trail.
        parsedJson: JSON.stringify(item),
        createdAt: nowIso()
      });
      out2.push({ itemId, txnId: txn.value.id, status: "pending", warnings });
    }
    return { batchId, items: out2 };
  });
  const response = JSON.stringify(result);
  if (o.idemKey) {
    await store.unitOfWork(
      (uow) => uow.recordCommandResult({
        idemKey: o.idemKey,
        requestSha256: requestSha,
        responseJson: response,
        createdAt: nowIso()
      })
    );
  }
  await store.close();
  out(result);
  note(`${result.items.length}\uAC74\uC744 DRAFT\uB85C \uAE30\uB85D\uD588\uC2B5\uB2C8\uB2E4. \uC794\uC561\xB7\uB9AC\uD3EC\uD2B8\uC5D0\uC11C \uC81C\uC678\uB429\uB2C8\uB2E4.`);
  for (const i of result.items) for (const w of i.warnings) note(`  \u26A0 ${w}`);
  note(`\uAC80\uD1A0: \`holiday review list\` \u2192 \`holiday review accept <id>\``);
});
var review = program2.command("review").description("\uB4DC\uB798\uD504\uD2B8 \uAC80\uD1A0 \u2014 \uC2B9\uC778 \uC804\uC5D4 \uC7A5\uBD80\uAC00 \uC544\uB2C8\uB2E4");
review.command("list").description("drafts waiting for a human").action(async () => {
  const ws = requireWorkspace();
  const config = readConfig(ws);
  const store = await openLedger(ws);
  const result = await store.read(async (r) => {
    const items = await r.listIngestItems({ status: "pending" });
    const accounts = new Map((await r.listAccounts()).map((a) => [a.id, a]));
    return Promise.all(
      items.map(async (i) => ({ item: i, txn: i.txnId ? await r.getTxn(i.txnId) : null, accounts }))
    );
  });
  await store.close();
  if (jsonMode()) {
    return out(
      result.map(({ item, txn }) => ({
        id: item.id,
        txnId: item.txnId,
        date: txn?.txn.date,
        payee: txn?.txn.payee,
        merchant: item.merchant
      }))
    );
  }
  if (result.length === 0) return note("\uAC80\uD1A0\uD560 \uB4DC\uB798\uD504\uD2B8\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.");
  for (const { item, txn, accounts } of result) {
    if (!txn) continue;
    note(`${item.id}  ${txn.txn.date}  ${txn.txn.payee ?? txn.txn.narration}`);
    for (const p of txn.txn.postings) {
      note(
        `    ${(accounts.get(p.accountId)?.code ?? "?").padEnd(36)} ${amounts.formatWithCode(p.units).padStart(16)}`
      );
    }
  }
  note("");
  note(`${result.length}\uAC74 \uB300\uAE30. \`holiday review accept <id>\` / \`reject <id> --reason\``);
});
review.command("accept <id>").description("promote a draft to posted. Cannot fail \u2014 it is already balanced.").option("--idem-key <key>").action(async (id, o) => {
  const ws = requireWorkspace();
  const store = await openLedger(ws);
  const result = await store.unitOfWork(async (uow) => {
    const items = await uow.listIngestItems();
    const item = items.find((i) => i.id === id);
    if (!item) throw new UsageError(`no such review item: ${id}`);
    if (item.status !== "pending") throw new UsageError(`item ${id} is already ${item.status}`);
    if (!item.txnId) throw new UsageError(`item ${id} has no transaction`);
    await uow.promoteDraft(item.txnId);
    await uow.setIngestItemStatus(id, "accepted", {});
    return { id, txnId: item.txnId };
  });
  await store.close();
  out({ ...result, status: "accepted" });
  note(`\uC2B9\uC778\uB428. \uC774\uC81C \uC794\uC561\uACFC \uD604\uAE08\uD750\uB984\uC5D0 \uB4E4\uC5B4\uAC11\uB2C8\uB2E4.`);
});
review.command("reject <id>").description("reject a draft. The row is KEPT \u2014 it is dedup memory.").requiredOption("--reason <text>").action(async (id, o) => {
  const ws = requireWorkspace();
  const store = await openLedger(ws);
  await store.unitOfWork(async (uow) => {
    const items = await uow.listIngestItems();
    const item = items.find((i) => i.id === id);
    if (!item) throw new UsageError(`no such review item: ${id}`);
    if (item.status !== "pending") throw new UsageError(`item ${id} is already ${item.status}`);
    if (item.txnId) await uow.rejectDraft(item.txnId, o.reason);
    await uow.setIngestItemStatus(id, "rejected", { reason: o.reason });
  });
  await store.close();
  out({ id, status: "rejected", reason: o.reason });
  note(`\uAC70\uBD80\uB428. \uAE30\uB85D\uC740 \uB0A8\uC2B5\uB2C8\uB2E4 \u2014 \uAC19\uC740 \uCEA1\uCCD0\uAC00 \uB2E4\uC2DC \uC81C\uC548\uB418\uB294 \uAC78 \uB9C9\uB294 \uAE30\uC5B5\uC785\uB2C8\uB2E4.`);
});
var loan = program2.command("loan").description("\uB300\uCD9C \u2014 \uC0C1\uD658 \uC2A4\uCF00\uC904\uACFC \uB300\uC0AC");
loan.command("add <code>").description("attach an amortization schedule to a loan liability account").requiredOption("--funding <code>", "the asset account payments come from").requiredOption("--interest <code>", "the expense account interest is booked to").requiredOption("--principal <amount>", "the loan amount").requiredOption("--rate <percent>", "annual rate as the contract writes it, e.g. 4.2").requiredOption("--months <n>", "term", Number).requiredOption("--first-payment <date>", "due date of the first payment").option("--method <m>", "annuity | equal_principal | bullet | interest_only", "annuity").option("--payment-day <n>", "day of month payments land. -1 = \uB9D0\uC77C", Number).option("--label <text>").action(
  async (code, o) => {
    const ws = requireWorkspace();
    const config = readConfig(ws);
    const store = await openLedger(ws);
    const firstPaymentDate = assertIsoDate(o.firstPayment);
    const principal = amounts.parse(o.principal, config.functionalCurrency);
    const annual = parseAnnualPercent(o.rate);
    const method = o.method;
    const paymentDay = o.paymentDay ?? Number(firstPaymentDate.slice(8, 10));
    const rows = buildLoanSchedule({
      principalMinor: principal.minor,
      monthlyRate: monthlyFromAnnual(annual),
      method,
      termMonths: o.months,
      firstPaymentDate,
      paymentDay
    });
    await store.unitOfWork(async (uow) => {
      const acct = await uow.getAccount(code);
      if (!acct) throw new UsageError(`no such account: ${code}`);
      const funding = await uow.getAccount(o.funding);
      if (!funding) throw new UsageError(`no such account: ${o.funding}`);
      const interest = await uow.getAccount(o.interest);
      if (!interest) throw new UsageError(`no such account: ${o.interest}`);
      await uow.upsertLoan(
        {
          accountId: acct.id,
          fundingAccountId: funding.id,
          interestAccountId: interest.id,
          principalMinor: principal.minor,
          commodity: principal.commodity,
          annualRateText: o.rate,
          method,
          termMonths: o.months,
          firstPaymentDate,
          paymentDay,
          label: o.label ?? null
        },
        rows
      );
    });
    await store.close();
    const money = (m) => amounts.format({ minor: m, commodity: principal.commodity });
    out({
      loan: code,
      method,
      rows: rows.length,
      firstPayment: rows[0].dueDate,
      lastPayment: rows.at(-1).dueDate,
      totalInterestMinor: scheduleInterest(rows).toString()
    });
    note(
      `${describeMethod(method)} ${money(principal.minor)} @ ${formatAnnualPercent(annual)}% \xD7 ${o.months}\uAC1C\uC6D4. ${rows[0].dueDate} ~ ${rows.at(-1).dueDate}.`
    );
    note(`1\uD68C\uCC28 ${money(rows[0].principalMinor + rows[0].interestMinor)} (\uC6D0\uAE08 ${money(rows[0].principalMinor)} + \uC774\uC790 ${money(rows[0].interestMinor)})`);
    note(`\uCD1D \uC774\uC790 ${money(scheduleInterest(rows))}`);
    note(`\uC774\uAC74 \uC608\uCE21\uC785\uB2C8\uB2E4. \uC2E4\uC81C \uC794\uC561\uACFC \uC5B4\uAE0B\uB098\uB294\uC9C0\uB294 \`holiday loan check\`.`);
  }
);
loan.command("list").description("loans and where they stand").action(async () => {
  const ws = requireWorkspace();
  const config = readConfig(ws);
  const store = await openLedger(ws);
  const now = assertIsoDate(today());
  const result = await store.read(async (r) => {
    const accounts = new Map((await r.listAccounts()).map((a) => [a.id, a]));
    const loans = await r.listLoans();
    const balances = await r.getBalances({ asOf: now });
    return loans.map((l) => ({
      ...l,
      code: accounts.get(l.loan.accountId)?.code ?? "?",
      balance: balances.filter((b) => b.accountId === l.loan.accountId).reduce((s, b) => s + b.weightMinor, 0n)
    }));
  });
  await store.close();
  if (jsonMode()) {
    return out(
      result.map((l) => ({
        ...l.loan,
        code: l.code,
        principalMinor: l.loan.principalMinor.toString(),
        outstandingMinor: (-l.balance).toString()
      }))
    );
  }
  if (result.length === 0) return note("no loans.");
  for (const l of result) {
    const money = (m) => amounts.format({ minor: m, commodity: l.loan.commodity });
    note(
      `${(l.loan.label ?? l.code).padEnd(24)} ${describeMethod(l.loan.method).padEnd(14)} ${l.loan.annualRateText}% \xD7 ${l.loan.termMonths}\uAC1C\uC6D4   \uC794\uC561 ${money(-l.balance)}`
    );
  }
});
loan.command("check [code]").description("does the ledger agree with the schedule").option("--as-of <date>", "ISO date", today()).action(async (code, o) => {
  const ws = requireWorkspace();
  const config = readConfig(ws);
  const store = await openLedger(ws);
  const asOf = assertIsoDate(o.asOf);
  const results = await store.read(async (r) => {
    const accounts = new Map((await r.listAccounts()).map((a) => [a.id, a]));
    const all = await r.listLoans();
    const wanted = code ? all.filter((l) => accounts.get(l.loan.accountId)?.code === code) : all;
    if (code && wanted.length === 0) throw new UsageError(`no loan on account: ${code}`);
    const balances = await r.getBalances({ asOf });
    return wanted.map((l) => {
      const ledgerBalanceMinor = balances.filter((b) => b.accountId === l.loan.accountId).reduce((s, b) => s + b.weightMinor, 0n);
      return {
        code: accounts.get(l.loan.accountId)?.code ?? "?",
        label: l.loan.label,
        commodity: l.loan.commodity,
        result: loanCheck({
          rows: l.rows,
          ledgerBalanceMinor,
          asOf,
          principalMinor: l.loan.principalMinor
        })
      };
    });
  });
  await store.close();
  if (jsonMode()) {
    return out(
      results.map((r) => ({
        code: r.code,
        ok: r.result.ok,
        expectedMinor: r.result.expectedMinor.toString(),
        actualMinor: r.result.actualMinor.toString(),
        deltaMinor: r.result.deltaMinor.toString(),
        explanation: r.result.explanation
      }))
    );
  }
  if (results.length === 0) return note("no loans to check.");
  let bad = 0;
  for (const r of results) {
    const money = (m) => amounts.format({ minor: m, commodity: r.commodity });
    note(`${r.label ?? r.code}  (${asOf})`);
    note(`  \uC2A4\uCF00\uC904:  ${money(r.result.expectedMinor).padStart(16)}`);
    note(`  \uC6D0\uC7A5:    ${money(r.result.actualMinor).padStart(16)}`);
    if (r.result.ok) {
      note(`  \u2713 ${r.result.explanation}`);
    } else {
      bad += 1;
      note(`  \u26A0 \uCC28\uC774 ${money(r.result.deltaMinor)}`);
      note(`    ${r.result.explanation}`);
    }
    note("");
  }
  if (bad > 0) throw new LedgerError("loan_drift", `${bad} loan(s) disagree with their schedule`);
});
loan.command("pay <code>").description("record a loan payment, split into principal and interest by the schedule").requiredOption("--date <date>", "the due date being paid").option("--amount <amount>", "what actually left the account, if it differs from the schedule").action(async (code, o) => {
  const ws = requireWorkspace();
  const config = readConfig(ws);
  const store = await openLedger(ws);
  const date = assertIsoDate(o.date);
  const result = await store.unitOfWork(async (uow) => {
    const acct = await uow.getAccount(code);
    if (!acct) throw new UsageError(`no such account: ${code}`);
    const l = await uow.getLoan(acct.id);
    if (!l) throw new UsageError(`${code} has no loan schedule. Add one with \`holiday loan add\`.`);
    const row = rowForDate(l.rows, date);
    if (!row) {
      throw new UsageError(
        `the schedule has no payment due on ${date}. Due dates are ${l.rows[0].dueDate}, ${l.rows[1]?.dueDate ?? "\u2026"}, \u2026 \u2014 check the date, or record it with \`holiday txn add\`.`
      );
    }
    const scheduled = row.principalMinor + row.interestMinor;
    const paid = o.amount ? amounts.parse(o.amount, l.loan.commodity).minor : scheduled;
    if (paid !== scheduled) {
      note(`\u26A0 \uC2E4\uC81C ${paid}, \uC2A4\uCF00\uC904 ${scheduled}. \uCC28\uC561\uC744 \uC6D0\uAE08\uC5D0 \uBC18\uC601\uD569\uB2C8\uB2E4 \u2014 \uBA85\uC138\uC11C\uC640 \uB300\uC870\uD558\uC138\uC694.`);
    }
    const interest = row.interestMinor;
    const principal = paid - interest;
    if (principal < 0n) {
      throw new UsageError(
        `${paid} does not even cover the scheduled interest (${interest}). Record this by hand with \`holiday txn add\` \u2014 this is not an ordinary payment.`
      );
    }
    const txn = Txn.create({
      id: nextUlid(),
      date,
      bookingCommodity: config.functionalCurrency,
      payee: l.loan.label ?? code,
      narration: `${row.seq}/${l.loan.termMonths} \uC0C1\uD658`,
      postings: [
        { accountId: acct.id, units: amounts.fromMinor(principal, l.loan.commodity) },
        { accountId: l.loan.interestAccountId, units: amounts.fromMinor(interest, l.loan.commodity) },
        { accountId: l.loan.fundingAccountId, units: amounts.fromMinor(-paid, l.loan.commodity) }
      ]
    });
    if (!txn.ok) throw new LedgerError("unbalanced", txn.error.map(describeTxnError).join("\n"));
    await uow.appendTxn(txn.value, { status: "posted" });
    return { txnId: txn.value.id, seq: row.seq, principal, interest, paid, commodity: l.loan.commodity };
  });
  await store.close();
  const money = (m) => amounts.format({ minor: m, commodity: result.commodity });
  out({
    id: result.txnId,
    seq: result.seq,
    principalMinor: result.principal.toString(),
    interestMinor: result.interest.toString()
  });
  note(`${result.seq}\uD68C\uCC28 ${money(result.paid)} = \uC6D0\uAE08 ${money(result.principal)} + \uC774\uC790 ${money(result.interest)}`);
});
program2.command("cashflow").description("will the cash survive the card bills that are already coming").option("--until <date>", "projection horizon", addMonthsIso(today(), 3)).action(async (o) => {
  const ws = requireWorkspace();
  const config = readConfig(ws);
  const store = await openLedger(ws);
  const now = assertIsoDate(today());
  const until = assertIsoDate(o.until);
  const result = await store.read(async (r) => {
    const accounts = await r.listAccounts();
    const byId = new Map(accounts.map((a) => [a.id, a]));
    const cards = (await r.listCards()).map((c) => ({
      accountId: c.accountId,
      accountCode: byId.get(c.accountId).code,
      fundingAccountId: c.fundingAccountId,
      rule: c.rule,
      label: c.label
    }));
    const cashIds = new Set(accounts.filter((a) => a.cash).map((a) => a.id));
    const balances = await r.getBalances({ asOf: now });
    const openingCash = balances.filter((b) => cashIds.has(b.accountId)).reduce((s, b) => s + b.weightMinor, 0n);
    const unmarked = accounts.filter((a) => a.type === "asset" && !a.cash && !a.placeholder && !a.closedOn);
    const postings = [];
    for await (const p of r.streamPostings({ from: addMonthsIso(today(), -4) })) {
      postings.push({
        txnId: p.txnId,
        txnDate: p.txnDate,
        accountId: p.accountId,
        weightMinor: p.weightMinor,
        commodity: p.commodity
      });
    }
    const installments = (await r.listInstallments({ activeOn: now })).map((i) => ({
      id: i.plan.id,
      cardAccountId: i.plan.cardAccountId,
      liabilityAccountId: i.plan.liabilityAccountId,
      label: i.plan.label,
      months: i.plan.months,
      rows: i.rows
    }));
    const recurring2 = await r.listRecurring({ activeOn: now });
    const loans = (await r.listLoans()).map((l) => ({
      accountId: l.loan.accountId,
      fundingAccountId: l.loan.fundingAccountId,
      label: l.loan.label,
      termMonths: l.loan.termMonths,
      rows: l.rows
    }));
    return { cards, openingCash, postings, installments, recurring: recurring2, unmarked, loans };
  });
  await store.close();
  const fundingByCard = new Map(result.cards.map((c) => [c.accountId, c.fundingAccountId]));
  const cardRules = new Map(
    result.cards.map((c) => [c.accountId, { rule: c.rule, fundingAccountId: c.fundingAccountId }])
  );
  const orphaned = result.installments.filter((i) => !fundingByCard.has(i.cardAccountId));
  const bills = projectCardBills({ cards: result.cards, postings: result.postings, today: now, until });
  const instRows = projectInstallments({ installments: result.installments, fundingByCard, today: now, until });
  const recRows = projectRecurring({ recurring: result.recurring, cardRules, today: now, until });
  const loanRows = projectLoans({ loans: result.loans, today: now, until });
  const runway = cashRunway(result.openingCash, [
    ...bills,
    ...instRows,
    ...recRows,
    ...loanRows
  ]);
  if (jsonMode()) {
    return out({
      openingCashMinor: result.openingCash.toString(),
      commodity: config.functionalCurrency,
      runway: runway.map((p) => ({
        date: p.date,
        outflowMinor: p.outflowMinor.toString(),
        balanceAfterMinor: p.balanceAfterMinor.toString(),
        items: p.items.map((b) => ({
          kind: b.kind ?? "card",
          label: describeOutflow(b),
          amountMinor: b.amountMinor.toString()
        }))
      }))
    });
  }
  const money = (m) => amounts.format({ minor: m, commodity: config.functionalCurrency });
  for (const o2 of orphaned) {
    note(`\u26A0 installment "${o2.label ?? o2.id}" is on a card with no billing cycle and is NOT in this projection.`);
  }
  for (const a of result.unmarked) {
    note(`\u26A0 ${a.code} is not marked --cash and is NOT counted as cash on hand.`);
  }
  note(`cash on hand (${now}):  ${money(result.openingCash)} ${config.functionalCurrency}`);
  if (runway.length === 0) {
    note(`no card bills projected through ${until}.`);
    return;
  }
  note("");
  for (const p of runway) {
    const short = p.balanceAfterMinor < 0n;
    note(`${p.date}   -${money(p.outflowMinor).padStart(12)}   \u2192  ${money(p.balanceAfterMinor).padStart(12)}${short ? "   \u26A0 SHORT" : ""}`);
    for (const b of p.items) {
      note(`             ${describeOutflow(b).padEnd(30)} ${money(b.amountMinor).padStart(12)}`);
    }
  }
  const worst = runway.reduce((a, b) => b.balanceAfterMinor < a.balanceAfterMinor ? b : a);
  note("");
  if (worst.balanceAfterMinor < 0n) {
    note(`\u26A0 Short by ${money(-worst.balanceAfterMinor)} ${config.functionalCurrency} on ${worst.date}.`);
  } else {
    note(`Lowest point: ${money(worst.balanceAfterMinor)} ${config.functionalCurrency} on ${worst.date}.`);
  }
});
function pickMoneyLeg(postings, byId, item) {
  if (item.dedupeOn) {
    const wanted = postings.find((p) => byId.get(p.accountId)?.code === item.dedupeOn);
    if (!wanted) throw new UsageError(`dedupeOn names ${item.dedupeOn}, which is not one of the legs`);
    return wanted;
  }
  const money = postings.find((p) => {
    const t = byId.get(p.accountId)?.type;
    return t === "liability" || t === "asset";
  });
  if (!money) {
    throw new UsageError(
      'no liability or asset leg to identify this transaction by. Add "dedupeOn" naming the card or bank account.'
    );
  }
  return money;
}
async function makeDeriveWeight(store, functional, date) {
  const { rates, staleness } = await store.read(async (r) => ({
    rates: await r.listFxRates({ to: date }),
    staleness: (await r.getBook()).fxMaxStalenessDays
  }));
  if (rates.length === 0) return void 0;
  const cache = /* @__PURE__ */ new Map();
  return (units) => {
    let hit = cache.get(units.commodity);
    if (!hit) {
      const resolved = resolveRate(rates, {
        base: units.commodity,
        quote: functional,
        asOf: date,
        maxStalenessDays: staleness,
        functional
      });
      hit = { rate: resolved.rate, text: formatRate(resolved.rate), id: resolved.rateIds[0] ?? null };
      cache.set(units.commodity, hit);
    }
    return {
      weightMinor: convert(units.minor, hit.rate, registry.exponentOf(units.commodity), registry.exponentOf(functional)),
      fxRateText: hit.text,
      fxRateId: hit.id
    };
  };
}
function nowIso() {
  return (/* @__PURE__ */ new Date()).toISOString();
}
function describeOutflow(b) {
  if (b.kind === "loan") return `${b.label ?? "\uB300\uCD9C"} (${b.seq}/${b.termMonths})`;
  if (b.kind === "installment") return `${b.label ?? "\uD560\uBD80"} (${b.seq}/${b.months})`;
  if (b.kind === "recurring") {
    return b.viaCardAccountId ? `${b.label} (${b.occurredOn} \uACB0\uC81C\uBD84)` : b.label;
  }
  return `${b.cardLabel ?? b.cardCode}  ${b.cycleFrom}..${b.cycleTo}`;
}
function addMonthsIso(date, delta) {
  const [y, m, d] = date.split("-").map(Number);
  const zero = m - 1 + delta;
  const ny = y + Math.floor(zero / 12);
  const nm = (zero % 12 + 12) % 12 + 1;
  const last = new Date(Date.UTC(ny, nm, 0)).getUTCDate();
  return `${String(ny).padStart(4, "0")}-${String(nm).padStart(2, "0")}-${String(Math.min(d, last)).padStart(2, "0")}`;
}
program2.command("verify").description("scan the whole ledger and the audit chain").option("--head", "print the audit chain head \u2014 anchor this outside the file", false).action(async (o) => {
  const ws = requireWorkspace();
  const store = await openLedger(ws);
  const report = await store.unitOfWork((uow) => uow.verify());
  const head = await store.chainHead();
  await store.close();
  if (jsonMode()) return out({ ...report, head });
  if (o.head) note(head ? `chain head: #${head.seq} ${head.hash}` : "chain head: (empty ledger)");
  if (report.ok) {
    note(`OK \u2014 ${report.checked} transaction(s) checked, audit chain intact.`);
    return;
  }
  for (const p of report.problems) note(`${p.kind}  ${p.subject}
  ${p.detail}`);
  throw new LedgerError("verify_failed", `${report.problems.length} problem(s) found`);
});
program2.command("checkpoint").description("fold the WAL back into ledger.db \u2014 run before committing").action(async () => {
  const ws = requireWorkspace();
  const store = await openLedger(ws);
  await store.checkpoint();
  await store.close();
  note("WAL checkpointed. ledger.db is safe to commit.");
});
function today() {
  return (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
}
function jsonMode() {
  return process.argv.includes("--json");
}
function out(value) {
  process.stdout.write(`${JSON.stringify(value, null, jsonMode() ? 2 : 0)}
`);
}
function note(s) {
  if (!jsonMode()) process.stderr.write(`${s}
`);
}
var LedgerError = class extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
  code;
};
program2.option("--json", "machine-readable output on stdout");
program2.parseAsync().catch((e) => {
  const code = e instanceof UsageError ? "usage" : e instanceof LedgerError ? e.code : "internal";
  const message = e instanceof Error ? e.message : String(e);
  process.stderr.write(`${JSON.stringify({ error: { code, message } })}
`);
  process.exit(code === "usage" ? 2 : 1);
});
