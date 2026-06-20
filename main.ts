export function isValid(email : string) : boolean {
    email = email.toLowerCase();
    email = email.trim();
    if (((email.match(/@/g) || []).length !== 1) || (email.match(/\s/g) || []).length) {
        return false;
    }


    return true;
}