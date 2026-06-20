export function isValid(email : string) : boolean {
    email = email.toLowerCase();
    email = email.trim();
    
    if (((email.match(/@/g) || []).length !== 1) || (email.match(/\s/g) || []).length) {
        return false;
    }
    
    if((email!=='${string}@${string}.{string}') || (email.startsWith('.')) || (email.endsWith('.')) ){
        return false;
    }

    var invalidChars = ['(', ')', ',', ':', ';', '<', '>', '[', ']', '\\', '"'];
    for (var i = 0; i < invalidChars.length; i++) {
        if (email.includes(invalidChars[i])) {
            return false;
        }
    }
    
    var front = email.split('@')[0];
    var back = email.split('@')[1];

    
    
    return true;
}
