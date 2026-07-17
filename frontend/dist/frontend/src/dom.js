export function getRequiredElement(id) {
    const element = document.getElementById(id);
    if (!element) {
        throw new Error(`Brak elementu DOM o id: ${id}`);
    }
    return element;
}
