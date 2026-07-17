#!/usr/bin/env node
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
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
  const { purchasedOn, months, totalMinor, cardRule } = opts;
  assertCardCycleRule(cardRule);
  if (opts.interestFree === false) {
    throw new InstallmentError(`interest-bearing installments are not computed yet: \uD560\uBD80\uC218\uC218\uB8CC depends on the issuer's declining-balance formula, and a plausible wrong number would silently corrupt your cash flow projection. Record the plan as interest-free and reconcile against the statement, or enter each row by hand.`);
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
      feeMinor: 0n
    };
  });
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

// src/legs.ts
function parseLeg(leg, amounts2, functionalCurrency, resolveAccount) {
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
    throw new UsageError(
      `leg ${JSON.stringify(leg)} is in ${units.commodity}, not ${functionalCurrency}, so its ${functionalCurrency} value cannot be inferred. Add "@@ <total in ${functionalCurrency}>".`
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

// ../store-sqlite/dist/chain.js
import { createHash } from "node:crypto";
var CHAIN_HASH_VERSION = 1;
var GENESIS_HASH = "0".repeat(64);
var sha256 = (s) => createHash("sha256").update(s, "utf8").digest("hex");
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
  return sha256(parts.join(""));
}
function chainHash(r, version = CHAIN_HASH_VERSION) {
  return sha256([`v${version}`, r.seq.toString(), r.at, r.event, r.subject, r.detail, r.prevHash].join(""));
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

// ../store-sqlite/dist/db.js
import { DatabaseSync } from "node:sqlite";
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

// ../store-sqlite/dist/schema.js
var SCHEMA_VERSION = 1;
var PRAGMAS = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 5000;
-- A personal ledger writes a few rows a day. Correctness beats throughput.
PRAGMA synchronous = FULL;
`;
var MIGRATION_001 = `
CREATE TABLE book (
  id                    TEXT PRIMARY KEY CHECK (id = 'book'),   -- singleton
  schema_version        INTEGER NOT NULL,
  functional_currency   TEXT NOT NULL REFERENCES commodity(code),
  -- Exactly ONE hard-close grain. A day sits inside a month; revaluing FX at
  -- both grains double-counts it. Daily/weekly are checkpoints, not closes.
  close_grain           TEXT NOT NULL DEFAULT 'month'
                          CHECK (close_grain IN ('day','week','month','quarter','year')),
  timezone              TEXT NOT NULL DEFAULT 'Asia/Seoul',
  dedupe_key_version    INTEGER NOT NULL DEFAULT 1,
  fx_max_staleness_days INTEGER NOT NULL DEFAULT 7,
  created_at            TEXT NOT NULL
) STRICT;

CREATE TABLE commodity (
  code     TEXT PRIMARY KEY,
  -- Capped at 9 because amounts are i64. 18-decimal ERC-20s are therefore not
  -- representable; ETH is defined at 8dp and truncates wei. Documented, accepted.
  exponent INTEGER NOT NULL CHECK (exponent BETWEEN 0 AND 9),
  kind     TEXT NOT NULL CHECK (kind IN ('fiat','crypto','security','unit')),
  name     TEXT NOT NULL
) STRICT;

CREATE TABLE account (
  id          TEXT PRIMARY KEY,
  -- A materialized path. Subtree query = code = ? OR code GLOB ? || ':*'.
  code        TEXT NOT NULL UNIQUE,
  type        TEXT NOT NULL CHECK (type IN ('asset','liability','equity','income','expense')),
  parent_id   TEXT REFERENCES account(id),
  -- NULL means opt-in multi-commodity (brokerage, crypto, Wise). Non-null is the
  -- default and is enforced on every posting.
  commodity   TEXT REFERENCES commodity(code),
  monetary    INTEGER NOT NULL DEFAULT 1 CHECK (monetary IN (0,1)),
  placeholder INTEGER NOT NULL DEFAULT 0 CHECK (placeholder IN (0,1)),
  opened_on   TEXT NOT NULL,
  closed_on   TEXT
) STRICT;

CREATE TABLE period (
  id     TEXT PRIMARY KEY,
  grain  TEXT NOT NULL CHECK (grain IN ('day','week','month','quarter','year')),
  start  TEXT NOT NULL,
  end    TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed','locked')),
  UNIQUE (grain, start)
) STRICT;

CREATE TABLE txn (
  id                TEXT PRIMARY KEY,
  date              TEXT NOT NULL,
  booking_commodity TEXT NOT NULL REFERENCES commodity(code),
  payee             TEXT,
  narration         TEXT NOT NULL DEFAULT '',
  status            TEXT NOT NULL CHECK (status IN ('draft','posted','void','rejected')),
  system_kind       TEXT CHECK (system_kind IN ('fx_revaluation','closing_entry','opening_balance')),
  corrects_txn_id   TEXT REFERENCES txn(id),
  source_item_id    TEXT,
  fx_estimated      INTEGER NOT NULL DEFAULT 0 CHECK (fx_estimated IN (0,1)),
  tags_json         TEXT NOT NULL DEFAULT '[]',
  meta_json         TEXT NOT NULL DEFAULT '{}',
  -- SQLite has no deferred CHECK constraints, so the balance rule cannot be a
  -- trigger on posting insert (the sum is legitimately non-zero mid-write).
  -- Instead: write postings against an unsealed txn, then seal it. The seal is
  -- the enforcement point, and nothing unsealed is ever readable as a fact.
  sealed            INTEGER NOT NULL DEFAULT 0 CHECK (sealed IN (0,1)),
  reason            TEXT,
  created_at        TEXT NOT NULL
) STRICT;

CREATE TABLE posting (
  txn_id        TEXT NOT NULL REFERENCES txn(id),
  seq           INTEGER NOT NULL,
  account_id    TEXT NOT NULL REFERENCES account(id),
  -- The FACT: what moved, in its own commodity.
  units_minor   INTEGER NOT NULL,
  commodity     TEXT NOT NULL REFERENCES commodity(code),
  -- The MEASUREMENT: the same movement in the booking commodity. Stored, never
  -- derived from a rate \u2014 that is what makes SUM(weight_minor) = 0 exact.
  weight_minor  INTEGER NOT NULL,
  weight_source TEXT NOT NULL CHECK (weight_source IN ('identity','actual','rate','plug')),
  -- Audit only. Never the source of truth for balancing.
  fx_rate_text  TEXT,
  fx_rate_id    TEXT,
  -- Nullable seam for cost-basis lots. Balancing never consults it.
  lot_id        TEXT,
  kind          TEXT NOT NULL DEFAULT 'normal' CHECK (kind IN ('normal','fx_revaluation','rounding')),
  memo          TEXT,
  PRIMARY KEY (txn_id, seq)
) STRICT;

CREATE INDEX posting_by_account ON posting(account_id);
CREATE INDEX txn_by_date        ON txn(date, id);
CREATE INDEX txn_by_status      ON txn(status);
CREATE INDEX account_by_code    ON account(code);

-- Schedule metadata for a liability account. Deliberately NOT in the journal.
--
-- A billing rule is a FORECAST, not a fact: it says when money will move, and it
-- changes when you switch cards or the issuer moves your payment date. Putting it
-- in the journal would mean every such change rewrites history. Facts go in
-- posting; predictions go here; they meet in the projection.
--
-- This is the same shape a loan's amortization schedule will take. A card, a
-- loan, and an installment plan are all the same thing to the ledger \u2014 a
-- liability \u2014 and differ only in the shape of their schedule.
CREATE TABLE card (
  account_id           TEXT PRIMARY KEY REFERENCES account(id),
  -- Where the cash actually comes from on the payment date.
  funding_account_id   TEXT NOT NULL REFERENCES account(id),
  -- Inclusive. A purchase on this day is on the bill closing that day.
  -- 31 means "closes at month end" and clamps in February.
  cycle_close_day      INTEGER NOT NULL CHECK (cycle_close_day BETWEEN 1 AND 31),
  payment_month_offset INTEGER NOT NULL CHECK (payment_month_offset BETWEEN 0 AND 3),
  -- -1 means the last day of the month (\uB9D0\uC77C).
  payment_day          INTEGER NOT NULL CHECK (payment_day = -1 OR payment_day BETWEEN 1 AND 31),
  label                TEXT
) STRICT;

-- \uD560\uBD80. A purchase split across N bills.
--
-- liability_account_id is deliberately NOT the ordinary card account. Ordinary
-- billing sums the postings inside a cycle, and an installment posts its whole
-- amount on the purchase date \u2014 sharing an account would put \u20A91,200,000 on the
-- first bill when \u20A9100,000 is due. Keeping them apart makes ordinary billing skip
-- installments for free; the rows below are projected instead, and the two rejoin
-- at the payment date the way a real statement shows them.
CREATE TABLE installment (
  id                   TEXT PRIMARY KEY,
  -- Whose statement carries the rows. Decides the payment dates.
  card_account_id      TEXT NOT NULL REFERENCES account(id),
  liability_account_id TEXT NOT NULL REFERENCES account(id),
  txn_id               TEXT REFERENCES txn(id),
  purchased_on         TEXT NOT NULL,
  months               INTEGER NOT NULL CHECK (months >= 1),
  total_minor          INTEGER NOT NULL CHECK (total_minor > 0),
  commodity            TEXT NOT NULL REFERENCES commodity(code),
  interest_free        INTEGER NOT NULL DEFAULT 1 CHECK (interest_free IN (0,1)),
  label                TEXT,
  CHECK (card_account_id <> liability_account_id)
) STRICT;

CREATE TABLE installment_row (
  installment_id  TEXT NOT NULL REFERENCES installment(id) ON DELETE CASCADE,
  -- 1-based, the way a statement numbers them (1/12, 2/12 \u2026).
  seq             INTEGER NOT NULL CHECK (seq >= 1),
  payment_date    TEXT NOT NULL,
  principal_minor INTEGER NOT NULL,
  -- \uD560\uBD80\uC218\uC218\uB8CC. Always 0 for interest-free plans; reserved for when the issuer's
  -- declining-balance formula is actually implemented rather than guessed.
  fee_minor       INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (installment_id, seq)
) STRICT;

CREATE INDEX installment_row_by_date ON installment_row(payment_date);
CREATE INDEX installment_by_card     ON installment(card_account_id);

-- \uC815\uAE30\uC9C0\uCD9C. Rent, subscriptions, insurance, telecom.
--
-- The third schedule in this file, and a forecast like the other two. Most
-- hand-rolled trackers model recurring spend as an ACCOUNT; that corrupts history
-- the moment a price changes or you cancel, because the past then disagrees with
-- the definition. Netflix is *expected* to take \u20A917,000 next month. When it
-- actually does, that is an ordinary transaction like any other.
--
-- funding_account_id carries the whole subtlety: a bank account means cash leaves
-- on the due date; a CARD means the due date only creates debt and the cash
-- leaves later, through that card's billing cycle.
CREATE TABLE recurring (
  id                 TEXT PRIMARY KEY,
  label              TEXT NOT NULL,
  expense_account_id TEXT NOT NULL REFERENCES account(id),
  funding_account_id TEXT NOT NULL REFERENCES account(id),
  amount_minor       INTEGER NOT NULL CHECK (amount_minor > 0),
  commodity          TEXT NOT NULL REFERENCES commodity(code),
  cadence_kind       TEXT NOT NULL CHECK (cadence_kind IN ('monthly','yearly')),
  -- -1 means the last day of the month (\uB9D0\uC77C).
  day_of_month       INTEGER NOT NULL CHECK (day_of_month = -1 OR day_of_month BETWEEN 1 AND 31),
  -- Only meaningful for 'yearly'.
  month              INTEGER CHECK (month IS NULL OR month BETWEEN 1 AND 12),
  active_from        TEXT NOT NULL,
  active_to          TEXT,
  CHECK (cadence_kind <> 'yearly' OR month IS NOT NULL)
) STRICT;

CREATE INDEX recurring_by_funding ON recurring(funding_account_id);

CREATE TABLE command_log (
  idem_key       TEXT PRIMARY KEY,
  request_sha256 TEXT NOT NULL,
  response_json  TEXT NOT NULL,
  created_at     TEXT NOT NULL
) STRICT;

-- The audit trail, as a hash chain.
--
-- The chain exists because this ledger does NOT use git history as its audit
-- mechanism. Without git there is no external tamper evidence, so the chain has
-- to supply it: each row commits to its predecessor, and a txn_append row also
-- commits to a content hash of the sealed transaction and its postings. Editing
-- a posting with the sqlite3 CLI therefore breaks verification even though the
-- ledger would still balance.
--
-- Honest limit: this detects casual and accidental tampering \u2014 a hand edit, a
-- buggy adapter, a partial restore. It does NOT stop someone with write access
-- from recomputing the whole chain. Closing that requires anchoring the head
-- hash somewhere outside the file (print it, commit it, mail it to yourself);
-- "holiday verify --head" exists for that.
CREATE TABLE audit_log (
  -- Assigned explicitly, not AUTOINCREMENT: the hash covers the seq, so the seq
  -- has to be known before the row is built.
  seq        INTEGER PRIMARY KEY,
  at         TEXT NOT NULL,
  event      TEXT NOT NULL,
  subject    TEXT NOT NULL,
  detail     TEXT NOT NULL DEFAULT '{}',
  prev_hash  TEXT NOT NULL,
  hash       TEXT NOT NULL UNIQUE
) STRICT;

-- Append-only, enforced. An audit trail you can quietly edit is decoration.
CREATE TRIGGER audit_log_immutable_update
BEFORE UPDATE ON audit_log
BEGIN
  SELECT RAISE(ABORT, 'holiday: the audit log is append-only');
END;

CREATE TRIGGER audit_log_immutable_delete
BEFORE DELETE ON audit_log
BEGIN
  SELECT RAISE(ABORT, 'holiday: the audit log is append-only');
END;

CREATE TABLE fx_rate (
  id         TEXT PRIMARY KEY,
  as_of      TEXT NOT NULL,
  base       TEXT NOT NULL REFERENCES commodity(code),
  quote      TEXT NOT NULL REFERENCES commodity(code),
  -- A decimal STRING. Never a float. Floats do not belong anywhere near money.
  rate       TEXT NOT NULL,
  source     TEXT NOT NULL,
  fetched_at TEXT NOT NULL,
  UNIQUE (as_of, base, quote, source)
) STRICT;

-- \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 ring 3: invariants at rest
-- These exist to catch bugs in the domain, unsafe casts, and someone opening the
-- file with the sqlite3 CLI. The domain is the authority; this is the backstop.
-- Only an engine-tier store can offer this at all, which is a standing argument
-- against ever making a Notion-shaped store the system of record.

CREATE TRIGGER txn_seal_requires_balance
BEFORE UPDATE OF sealed ON txn
WHEN NEW.sealed = 1 AND OLD.sealed = 0
BEGIN
  SELECT RAISE(ABORT, 'holiday: transaction has fewer than two postings')
  WHERE (SELECT COUNT(*) FROM posting WHERE txn_id = NEW.id) < 2;

  SELECT RAISE(ABORT, 'holiday: unbalanced transaction \u2014 postings must sum to exactly zero')
  WHERE (SELECT COALESCE(SUM(weight_minor), 0) FROM posting WHERE txn_id = NEW.id) <> 0;
END;

CREATE TRIGGER posting_rejects_placeholder_account
BEFORE INSERT ON posting
BEGIN
  SELECT RAISE(ABORT, 'holiday: cannot post to a placeholder account')
  WHERE (SELECT placeholder FROM account WHERE id = NEW.account_id) = 1;
END;

CREATE TRIGGER posting_commodity_conformance
BEFORE INSERT ON posting
BEGIN
  -- The most likely real error in the whole system: the vision model reads '$'
  -- as '\u20A9' and posts USD into a KRW-only account. This is where it dies.
  SELECT RAISE(ABORT, 'holiday: posting commodity does not match the account''s declared commodity')
  WHERE (SELECT commodity FROM account WHERE id = NEW.account_id) IS NOT NULL
    AND (SELECT commodity FROM account WHERE id = NEW.account_id) <> NEW.commodity;
END;

CREATE TRIGGER posting_identity_weight
BEFORE INSERT ON posting
BEGIN
  SELECT RAISE(ABORT, 'holiday: a posting already in the booking commodity must have weight = units')
  WHERE NEW.commodity = (SELECT booking_commodity FROM txn WHERE id = NEW.txn_id)
    AND NEW.weight_minor <> NEW.units_minor;
END;

-- The journal is append-only. Once sealed, postings are facts.
CREATE TRIGGER posting_immutable_insert
BEFORE INSERT ON posting
WHEN (SELECT sealed FROM txn WHERE id = NEW.txn_id) = 1
BEGIN
  SELECT RAISE(ABORT, 'holiday: cannot add a posting to a sealed transaction \u2014 write a correction instead');
END;

CREATE TRIGGER posting_immutable_update
BEFORE UPDATE ON posting
WHEN (SELECT sealed FROM txn WHERE id = OLD.txn_id) = 1
BEGIN
  SELECT RAISE(ABORT, 'holiday: postings of a sealed transaction are immutable \u2014 write a correction instead');
END;

CREATE TRIGGER posting_immutable_delete
BEFORE DELETE ON posting
WHEN (SELECT sealed FROM txn WHERE id = OLD.txn_id) = 1
BEGIN
  SELECT RAISE(ABORT, 'holiday: postings of a sealed transaction cannot be deleted \u2014 void or correct instead');
END;

CREATE TRIGGER txn_never_unseals
BEFORE UPDATE OF sealed ON txn
WHEN OLD.sealed = 1 AND NEW.sealed = 0
BEGIN
  SELECT RAISE(ABORT, 'holiday: a sealed transaction cannot be unsealed');
END;

-- An exponent change silently rescales every amount of that commodity. It is a
-- migration, not an edit.
CREATE TRIGGER commodity_exponent_immutable
BEFORE UPDATE OF exponent ON commodity
WHEN OLD.exponent <> NEW.exponent
  AND EXISTS (SELECT 1 FROM posting WHERE commodity = OLD.code)
BEGIN
  SELECT RAISE(ABORT, 'holiday: cannot change the exponent of a commodity that has postings');
END;
`;
var MIGRATIONS = [{ version: 1, sql: MIGRATION_001 }];

// ../store-sqlite/dist/store.js
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
var SqliteLedgerStore = class {
  name = "sqlite";
  capabilities = CAPS;
  #db;
  #opts;
  #now;
  constructor(opts) {
    this.#opts = opts;
    this.#now = opts.now ?? (() => (/* @__PURE__ */ new Date()).toISOString());
    this.#db = new Db(opts.path);
  }
  async init() {
    assertEngineTier(this.name, this.capabilities);
    this.#db.exec(PRAGMAS);
  }
  async migrate() {
    const from = this.#userVersion();
    for (const m of MIGRATIONS) {
      if (m.version <= from)
        continue;
      this.#db.transaction(() => {
        this.#db.exec(m.sql);
        this.#db.exec(`PRAGMA user_version = ${m.version}`);
      });
    }
    this.#seedBook();
    return { from, to: this.#userVersion() };
  }
  #userVersion() {
    const row = this.#db.get("PRAGMA user_version");
    return row ? toInt(row.user_version) : 0;
  }
  #seedBook() {
    const existing = this.#db.get("SELECT functional_currency FROM book WHERE id = ?", "book");
    if (existing) {
      if (existing.functional_currency !== this.#opts.book.functionalCurrency) {
        throw new Error(`this ledger is denominated in ${existing.functional_currency}, but was opened as ${this.#opts.book.functionalCurrency}. A book's functional currency cannot be changed in place.`);
      }
      return;
    }
    this.#db.transaction(() => {
      this.#db.run(`INSERT OR IGNORE INTO commodity (code, exponent, kind, name) VALUES (?, ?, ?, ?)`, this.#opts.book.functionalCurrency, 0, "fiat", this.#opts.book.functionalCurrency);
      this.#db.run(`INSERT INTO book (id, schema_version, functional_currency, close_grain, timezone, created_at)
         VALUES ('book', ?, ?, ?, ?, ?)`, SCHEMA_VERSION, this.#opts.book.functionalCurrency, this.#opts.book.closeGrain ?? "month", this.#opts.book.timezone ?? "Asia/Seoul", this.#now());
    });
  }
  async unitOfWork(fn) {
    const uow = new SqliteUow(this.#db, this.#now);
    this.#db.exec("BEGIN IMMEDIATE");
    let out2;
    try {
      out2 = await fn(uow);
    } catch (e) {
      try {
        this.#db.exec("ROLLBACK");
      } catch {
      }
      throw e;
    }
    this.#db.exec("COMMIT");
    return out2;
  }
  async read(fn) {
    return fn(new SqliteUow(this.#db, this.#now));
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
    return chainHeadOf(this.#db);
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
    this.#db.exec("PRAGMA wal_checkpoint(TRUNCATE)");
  }
  async close() {
    this.#db.close();
  }
};
var SqliteUow = class {
  db;
  now;
  constructor(db, now) {
    this.db = db;
    this.now = now;
  }
  async getBook() {
    const r = this.db.get("SELECT * FROM book WHERE id = ?", "book");
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
    return this.db.all("SELECT * FROM commodity ORDER BY code").map((r) => ({
      code: r.code,
      exponent: toInt(r.exponent),
      kind: r.kind,
      name: r.name
    }));
  }
  async upsertCommodity(c) {
    this.db.run(`INSERT INTO commodity (code, exponent, kind, name) VALUES (?, ?, ?, ?)
       ON CONFLICT(code) DO UPDATE SET exponent = excluded.exponent, kind = excluded.kind, name = excluded.name`, c.code, c.exponent, c.kind, c.name);
  }
  async getAccount(idOrCode) {
    const r = this.db.get("SELECT * FROM account WHERE id = ? OR code = ?", idOrCode, idOrCode);
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
      params.push(filter.prefix, `${filter.prefix}:*`);
    }
    if (!filter?.includeClosed)
      where.push("closed_on IS NULL");
    const sql = `SELECT * FROM account ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY code`;
    return this.db.all(sql, ...params).map(mapAccount);
  }
  async upsertAccount(a) {
    this.db.run(`INSERT INTO account (id, code, type, parent_id, commodity, monetary, placeholder, opened_on, closed_on)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         code = excluded.code, type = excluded.type, parent_id = excluded.parent_id,
         commodity = excluded.commodity, monetary = excluded.monetary,
         placeholder = excluded.placeholder, closed_on = excluded.closed_on`, a.id, a.code, a.type, a.parentId, a.commodity, a.monetary ? 1 : 0, a.placeholder ? 1 : 0, a.openedOn, a.closedOn);
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
    this.db.run(`INSERT INTO txn (id, date, booking_commodity, payee, narration, status, system_kind,
                        corrects_txn_id, source_item_id, fx_estimated, tags_json, meta_json, sealed, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`, tx.id, tx.date, tx.bookingCommodity, tx.payee, tx.narration, opts.status, tx.systemKind, tx.correctsTxnId, tx.sourceItemId, tx.fxEstimated ? 1 : 0, JSON.stringify(tx.tags), JSON.stringify(tx.meta), this.now());
    for (const p of tx.postings) {
      this.db.run(`INSERT INTO posting (txn_id, seq, account_id, units_minor, commodity, weight_minor,
                              weight_source, fx_rate_text, fx_rate_id, lot_id, kind, memo)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, tx.id, p.seq, p.accountId, p.units.minor, p.units.commodity, p.weightMinor, p.weightSource, p.fxRateText, p.fxRateId, p.lotId, p.kind, p.memo);
    }
    this.db.run("UPDATE txn SET sealed = 1 WHERE id = ?", tx.id);
    this.#appendAudit("txn_append", tx.id, {
      status: opts.status,
      contentSha256: txnContentHash(tx),
      hashVersion: CHAIN_HASH_VERSION
    });
    return tx.id;
  }
  /** Every mutation lands here. An audit trail with holes is not an audit trail. */
  #appendAudit(event, subject, detail) {
    const head = this.db.get("SELECT seq, hash FROM audit_log ORDER BY seq DESC LIMIT 1");
    const seq = head ? toInt(head.seq) + 1 : 1;
    const prevHash = head?.hash ?? GENESIS_HASH;
    const at = this.now();
    const detailJson = stableJson(detail);
    const hash = chainHash({ seq, at, event, subject, detail: detailJson, prevHash });
    this.db.run("INSERT INTO audit_log (seq, at, event, subject, detail, prev_hash, hash) VALUES (?, ?, ?, ?, ?, ?, ?)", seq, at, event, subject, detailJson, prevHash, hash);
  }
  async promoteDraft(id) {
    const changed = this.#setStatus(id, "posted", "draft", null);
    if (!changed)
      throw new Error(`holiday: ${id} is not a draft, so it cannot be accepted`);
  }
  async rejectDraft(id, reason) {
    const changed = this.#setStatus(id, "rejected", "draft", reason);
    if (!changed)
      throw new Error(`holiday: ${id} is not a draft, so it cannot be rejected`);
  }
  async voidTxn(id, reason) {
    const changed = this.#setStatus(id, "void", "posted", reason);
    if (!changed)
      throw new Error(`holiday: ${id} is not posted, so it cannot be voided`);
  }
  #setStatus(id, to, from, reason) {
    const before = this.db.get("SELECT COUNT(*) AS n FROM txn WHERE id = ? AND status = ?", id, from);
    if (!before || toInt(before.n) === 0)
      return false;
    this.db.run("UPDATE txn SET status = ?, reason = ? WHERE id = ?", to, reason, id);
    this.#appendAudit("txn_status", id, { from, to, reason });
    return true;
  }
  async getTxn(id) {
    const t = this.db.get("SELECT * FROM txn WHERE id = ? AND sealed = 1", id);
    if (!t)
      return null;
    const rows = this.db.all(`SELECT p.*, a.code AS account_code, t.date AS txn_date, t.status AS txn_status
       FROM posting p JOIN account a ON a.id = p.account_id JOIN txn t ON t.id = p.txn_id
       WHERE p.txn_id = ? ORDER BY p.seq`, id);
    return { txn: mapTxn(t, rows), status: t.status };
  }
  async listTxns(q) {
    const { where, params } = buildWhere(q, "t");
    const limit = q.limit ? ` LIMIT ${toInt(q.limit)}` : "";
    const offset = q.offset ? ` OFFSET ${toInt(q.offset)}` : "";
    const ts = this.db.all(`SELECT DISTINCT t.* FROM txn t WHERE ${where} ORDER BY t.date, t.id${limit}${offset}`, ...params);
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
    const accountParams = q.accountPrefix ? [q.accountPrefix, `${q.accountPrefix}:*`] : [];
    const idWhere = q.accountIds?.length ? ` AND p.account_id IN (${q.accountIds.map(() => "?").join(",")})` : "";
    const idParams = q.accountIds ? [...q.accountIds] : [];
    const rows = this.db.all(`SELECT p.*, a.code AS account_code, t.date AS txn_date, t.status AS txn_status
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
    const accountParams = q.accountPrefix ? [q.accountPrefix, `${q.accountPrefix}:*`] : [];
    const idWhere = q.accountIds?.length ? ` AND p.account_id IN (${q.accountIds.map(() => "?").join(",")})` : "";
    const idParams = q.accountIds ? [...q.accountIds] : [];
    return this.db.all(`SELECT p.account_id, a.code AS account_code, p.commodity,
                SUM(p.units_minor) AS units, SUM(p.weight_minor) AS weight
         FROM posting p JOIN txn t ON t.id = p.txn_id JOIN account a ON a.id = p.account_id
         WHERE ${where}${accountWhere}${idWhere}
         GROUP BY p.account_id, a.code, p.commodity
         ORDER BY a.code, p.commodity`, ...params, ...accountParams, ...idParams).map((r) => ({
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
    return this.db.all(`SELECT * FROM period ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY start`, ...params).map((r) => ({
      id: r.id,
      grain: r.grain,
      start: r.start,
      end: r.end,
      status: r.status
    }));
  }
  async findPeriodFor(date, grain) {
    const r = this.db.get("SELECT * FROM period WHERE grain = ? AND start <= ? AND end >= ?", grain, date, date);
    return r ? {
      id: r.id,
      grain: r.grain,
      start: r.start,
      end: r.end,
      status: r.status
    } : null;
  }
  async setPeriodStatus(id, s, meta) {
    this.db.run("UPDATE period SET status = ? WHERE id = ?", s, id);
    this.#appendAudit("period_status", id, { status: s, reason: meta.reason ?? null });
  }
  async listCards() {
    return this.db.all("SELECT * FROM card ORDER BY account_id").map(mapCard);
  }
  async getCard(accountId) {
    const r = this.db.get("SELECT * FROM card WHERE account_id = ?", accountId);
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
    this.db.run(`INSERT INTO card (account_id, funding_account_id, cycle_close_day, payment_month_offset, payment_day, label)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(account_id) DO UPDATE SET
         funding_account_id = excluded.funding_account_id,
         cycle_close_day = excluded.cycle_close_day,
         payment_month_offset = excluded.payment_month_offset,
         payment_day = excluded.payment_day,
         label = excluded.label`, c.accountId, c.fundingAccountId, c.rule.cycleCloseDay, c.rule.paymentMonthOffset, c.rule.paymentDay, c.label);
    this.#appendAudit("card_upsert", c.accountId, { rule: c.rule, fundingAccountId: c.fundingAccountId });
  }
  async listInstallments(filter) {
    const plans = this.db.all("SELECT * FROM installment ORDER BY purchased_on, id");
    const out2 = [];
    for (const p of plans) {
      const rows = this.#rowsOf(p.id);
      if (filter?.activeOn && !rows.some((r) => r.paymentDate > filter.activeOn))
        continue;
      out2.push({ plan: mapInstallment(p), rows });
    }
    return out2;
  }
  async getInstallment(id) {
    const p = this.db.get("SELECT * FROM installment WHERE id = ?", id);
    return p ? { plan: mapInstallment(p), rows: this.#rowsOf(id) } : null;
  }
  #rowsOf(installmentId) {
    return this.db.all("SELECT * FROM installment_row WHERE installment_id = ? ORDER BY seq", installmentId).map((r) => ({
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
    const total = rows.reduce((s, r) => s + r.principalMinor + r.feeMinor, 0n);
    if (total !== plan.totalMinor) {
      throw new Error(`holiday: schedule rows sum to ${total} but the plan total is ${plan.totalMinor}`);
    }
    if (rows.length !== plan.months) {
      throw new Error(`holiday: plan says ${plan.months} months but got ${rows.length} rows`);
    }
    this.db.run(`INSERT INTO installment (id, card_account_id, liability_account_id, txn_id, purchased_on,
                                months, total_minor, commodity, interest_free, label)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         card_account_id = excluded.card_account_id,
         liability_account_id = excluded.liability_account_id,
         txn_id = excluded.txn_id, purchased_on = excluded.purchased_on,
         months = excluded.months, total_minor = excluded.total_minor,
         commodity = excluded.commodity, interest_free = excluded.interest_free,
         label = excluded.label`, plan.id, plan.cardAccountId, plan.liabilityAccountId, plan.txnId, plan.purchasedOn, plan.months, plan.totalMinor, plan.commodity, plan.interestFree ? 1 : 0, plan.label);
    this.db.run("DELETE FROM installment_row WHERE installment_id = ?", plan.id);
    for (const r of rows) {
      this.db.run("INSERT INTO installment_row (installment_id, seq, payment_date, principal_minor, fee_minor) VALUES (?, ?, ?, ?, ?)", plan.id, r.seq, r.paymentDate, r.principalMinor, r.feeMinor);
    }
    this.#appendAudit("installment_upsert", plan.id, {
      months: plan.months,
      totalMinor: plan.totalMinor.toString(),
      cardAccountId: plan.cardAccountId
    });
  }
  async listRecurring(filter) {
    const rows = this.db.all("SELECT * FROM recurring ORDER BY label, id").map(mapRecurring);
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
    this.db.run(`INSERT INTO recurring (id, label, expense_account_id, funding_account_id, amount_minor, commodity,
                              cadence_kind, day_of_month, month, active_from, active_to)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         label = excluded.label, expense_account_id = excluded.expense_account_id,
         funding_account_id = excluded.funding_account_id, amount_minor = excluded.amount_minor,
         commodity = excluded.commodity, cadence_kind = excluded.cadence_kind,
         day_of_month = excluded.day_of_month, month = excluded.month,
         active_from = excluded.active_from, active_to = excluded.active_to`, r.id, r.label, r.expenseAccountId, r.fundingAccountId, r.amountMinor, r.commodity, r.cadence.kind, r.cadence.dayOfMonth, r.cadence.kind === "yearly" ? r.cadence.month : null, r.activeFrom, r.activeTo);
    this.#appendAudit("recurring_upsert", r.id, {
      label: r.label,
      amountMinor: r.amountMinor.toString(),
      cadence: r.cadence
    });
  }
  async getCommandResult(idemKey) {
    const r = this.db.get("SELECT * FROM command_log WHERE idem_key = ?", idemKey);
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
    this.db.run("INSERT INTO command_log (idem_key, request_sha256, response_json, created_at) VALUES (?, ?, ?, ?)", r.idemKey, r.requestSha256, r.responseJson, r.createdAt);
  }
  /** Ring 4. Cheap here because it is just SQL — over a Notion-shaped store it would be an hour. */
  async verify() {
    const problems = [];
    for (const r of this.db.all("SELECT txn_id, SUM(weight_minor) AS residual FROM posting GROUP BY txn_id HAVING SUM(weight_minor) <> 0")) {
      problems.push({
        kind: "unbalanced_txn",
        subject: r.txn_id,
        detail: `postings sum to ${r.residual}, expected 0`
      });
    }
    for (const r of this.db.all(`SELECT p.txn_id, p.seq, p.units_minor, p.weight_minor
       FROM posting p JOIN txn t ON t.id = p.txn_id
       WHERE p.commodity = t.booking_commodity AND p.weight_minor <> p.units_minor`)) {
      problems.push({
        kind: "identity_weight",
        subject: `${r.txn_id}#${r.seq}`,
        detail: `booking-commodity posting has weight ${r.weight_minor} but units ${r.units_minor}`
      });
    }
    for (const r of this.db.all(`SELECT p.txn_id, p.seq, p.commodity, a.commodity AS declared
       FROM posting p JOIN account a ON a.id = p.account_id
       WHERE a.commodity IS NOT NULL AND a.commodity <> p.commodity`)) {
      problems.push({
        kind: "commodity_conformance",
        subject: `${r.txn_id}#${r.seq}`,
        detail: `posting is ${r.commodity} but the account is declared ${r.declared}`
      });
    }
    for (const r of this.db.all("SELECT id FROM txn WHERE sealed = 0")) {
      problems.push({
        kind: "unbalanced_txn",
        subject: r.id,
        detail: "transaction was never sealed \u2014 it was written but its balance was never asserted"
      });
    }
    problems.push(...this.#verifyChain());
    const counted = this.db.get("SELECT COUNT(*) AS n FROM txn");
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
  #verifyChain() {
    const problems = [];
    const rows = this.db.all("SELECT * FROM audit_log ORDER BY seq");
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
          const problem = this.#verifyTxnContent(r.subject, detail.contentSha256, detail.hashVersion);
          if (problem)
            problems.push(problem);
        }
      }
    }
    return problems;
  }
  #verifyTxnContent(txnId, expected, version) {
    const t = this.db.get("SELECT * FROM txn WHERE id = ?", txnId);
    if (!t) {
      return {
        kind: "content_tampered",
        subject: txnId,
        detail: "the chain records this transaction but it is no longer in the ledger"
      };
    }
    const rows = this.db.all(`SELECT p.*, a.code AS account_code, t.date AS txn_date, t.status AS txn_status
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
function chainHeadOf(db) {
  const head = db.get("SELECT seq, hash FROM audit_log ORDER BY seq DESC LIMIT 1");
  return head ? { seq: toInt(head.seq), hash: head.hash } : null;
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
  return new SqliteLedgerStore({
    path: join(ws, "ledger.db"),
    book: {
      functionalCurrency: config.functionalCurrency,
      closeGrain: config.closeGrain,
      timezone: config.timezone
    }
  });
}

// src/cli.ts
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
  const store = openStore(ws);
  await store.init();
  await store.migrate();
  await store.unitOfWork(async (uow) => {
    for (const c of registry.all()) await uow.upsertCommodity(c);
  });
  await store.close();
  out({ workspace: ws, functionalCurrency: currency, closeGrain: o.closeGrain });
  note(`Ledger created at ${ws}`);
  note(`Commit ledger.db. Keep this repository PRIVATE \u2014 it is your money.`);
});
var account = program2.command("account").description("manage accounts");
account.command("add <code>").description("add an account, e.g. Assets:Bank:KB:Checking").option("--commodity <code>", "restrict to one commodity (recommended); omit for multi-commodity").option("--non-monetary", "exclude from FX revaluation (equipment, prepaid)", false).option("--placeholder", "a grouping node that cannot be posted to", false).option("--opened <date>", "ISO date", today()).action(async (code, o) => {
  const ws = requireWorkspace();
  const store = openStore(ws);
  await store.init();
  const c = assertAccountCode(code);
  const acct = {
    id: nextUlid(),
    code: c,
    type: accountTypeOf(c),
    parentId: null,
    commodity: o.commodity ? registry.get(o.commodity).code : null,
    monetary: !o.nonMonetary,
    placeholder: o.placeholder,
    openedOn: assertIsoDate(o.opened),
    closedOn: null
  };
  await store.unitOfWork((uow) => uow.upsertAccount(acct));
  await store.close();
  out({ id: acct.id, code: acct.code, type: acct.type, commodity: acct.commodity });
});
account.command("list").description("list accounts").action(async () => {
  const ws = requireWorkspace();
  const store = openStore(ws);
  await store.init();
  const accounts = await store.read((r) => r.listAccounts());
  await store.close();
  if (jsonMode()) return out(accounts);
  for (const a of accounts) {
    note(`${a.code.padEnd(40)} ${(a.commodity ?? "(multi)").padEnd(8)}${a.placeholder ? " [placeholder]" : ""}`);
  }
});
program2.command("txn").command("add").description("record a transaction").option("--date <date>", "ISO date", today()).option("--payee <name>").option("--narration <text>", "", "").requiredOption(
  "--leg <leg...>",
  "ACCOUNT AMOUNT COMMODITY [@@ TOTAL]. Repeatable. Must sum to zero in the functional currency."
).option("--draft", "record as a draft pending review", false).action(async (o) => {
  const ws = requireWorkspace();
  const config = readConfig(ws);
  const store = openStore(ws);
  await store.init();
  const byCode = /* @__PURE__ */ new Map();
  for (const a of await store.read((r) => r.listAccounts())) byCode.set(a.code, a);
  const resolve2 = (code) => {
    const a = byCode.get(code);
    if (!a) throw new UsageError(`no such account: ${code}. Create it with \`holiday account add ${code}\`.`);
    return a;
  };
  const postings = o.leg.map((l) => parseLeg(l, amounts, config.functionalCurrency, resolve2));
  const result = Txn.create({
    id: nextUlid(),
    date: assertIsoDate(o.date),
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
  const store = openStore(ws);
  await store.init();
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
    const store = openStore(ws);
    await store.init();
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
  const store = openStore(ws);
  await store.init();
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
installment.command("add").description("record an installment purchase and build its schedule").requiredOption("--card <code>", "the card whose statement carries the rows").requiredOption("--expense <code>", "what you bought").requiredOption("--total <amount>", "the full purchase amount").requiredOption("--months <n>", "term", Number).option("--liability <code>", "installment balance account (default: <card>:Installment)").option("--date <date>", "purchase date", today()).option("--payee <name>").option("--label <text>").option("--remainder-on <first|last>", "which row absorbs the odd won", "first").action(
  async (o) => {
    const ws = requireWorkspace();
    const config = readConfig(ws);
    const store = openStore(ws);
    await store.init();
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
          placeholder: false,
          openedOn: purchasedOn,
          closedOn: null
        });
        note(`created ${liabilityCode} (installment balances are kept apart from ordinary card charges)`);
      }
      const rows = buildInstallmentSchedule({
        purchasedOn,
        months: o.months,
        totalMinor: totalAmount.minor,
        cardRule: card2.rule,
        remainderOn: o.remainderOn === "last" ? "last" : "first"
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
          interestFree: true,
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
    note(
      `${o.months}\uAC1C\uC6D4 \uBB34\uC774\uC790 \uD560\uBD80, ${amounts.format(totalAmount)} ${config.functionalCurrency}. First ${result.rows[0].paymentDate}, last ${result.rows.at(-1).paymentDate}.`
    );
  }
);
installment.command("list").description("installments with money still to move").action(async () => {
  const ws = requireWorkspace();
  const config = readConfig(ws);
  const store = openStore(ws);
  await store.init();
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
    const store = openStore(ws);
    await store.init();
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
  const store = openStore(ws);
  await store.init();
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
program2.command("cashflow").description("will the cash survive the card bills that are already coming").option("--until <date>", "projection horizon", addMonthsIso(today(), 3)).action(async (o) => {
  const ws = requireWorkspace();
  const config = readConfig(ws);
  const store = openStore(ws);
  await store.init();
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
    const balances = await r.getBalances({ asOf: now });
    const openingCash = balances.filter((b) => isCashAccount(b.accountCode) && b.commodity === config.functionalCurrency).reduce((s, b) => s + b.weightMinor, 0n);
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
    return { cards, openingCash, postings, installments, recurring: recurring2 };
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
  const runway = cashRunway(result.openingCash, [...bills, ...instRows, ...recRows]);
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
function describeOutflow(b) {
  if (b.kind === "installment") return `${b.label ?? "\uD560\uBD80"} (${b.seq}/${b.months})`;
  if (b.kind === "recurring") {
    return b.viaCardAccountId ? `${b.label} (${b.occurredOn} \uACB0\uC81C\uBD84)` : b.label;
  }
  return `${b.cardLabel ?? b.cardCode}  ${b.cycleFrom}..${b.cycleTo}`;
}
function isCashAccount(code) {
  return code.startsWith("Assets:Bank") || code.startsWith("Assets:Cash");
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
  const store = openStore(ws);
  await store.init();
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
  const store = openStore(ws);
  await store.init();
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
