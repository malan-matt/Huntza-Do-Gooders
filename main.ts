export function isValid(email : string) : boolean {
    email = email.toLowerCase();
    email = email.trim();
    if (((email.match(/@/g) || []).length !== 1) || ("str1,str2,str3,str4".match(/\s/g) || []).length) {
        return false;
    }

    return true;
}