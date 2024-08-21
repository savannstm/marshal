export const encodingShortSymbol = "__symbol__E";
export const encodingSymbol = "__symbol__encoding";
export const extendsSymbol = "__ruby_extends__";
export const defaultSymbol = "__ruby_default__";

export const enum Constants {
    True = 84, // 'T'
    False = 70, // 'F'
    Nil = 48, // '0'
    Fixnum = 105, // 'i'
    Symbol = 58, // ':'
    Symlink = 59, // ';'
    Link = 64, // '@'
    InstanceVar = 73, // 'I'
    Extended = 101, // 'e'
    Array = 91, // '['
    Bignum = 108, // 'l'
    Class = 99, // 'c'
    Module = 109, // 'm'
    ModuleOld = 77, // 'M'
    Data = 100, // 'd'
    Float = 102, // 'f'
    Hash = 123, // '{'
    HashDef = 125, // '}'
    Object = 111, // 'o'
    Regexp = 47, // '/'
    String = 34, // '"'
    Struct = 83, // 'S'
    UserClass = 67, // 'C'
    UserDef = 117, // 'u'
    UserMarshal = 85, // 'U'
    Positive = 43, // '+'
    Negative = 45, // '-'
    RegExpIgnoreCase = 1, // Regular expression flag for ignore case
    RegExpExtended = 2, // Regular expression flag for extended mode
    RegExpMultiline = 4, // Regular expression flag for multiline mode
}
