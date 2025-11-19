function updateHashDividers() {
  document.querySelectorAll("[data-hash-divider]").forEach((el) => {
    // Create test element to measure character width
    const test = document.createElement("span");
    test.style.visibility = "hidden";
    test.style.position = "absolute";
    test.style.fontFamily = getComputedStyle(el).fontFamily;
    test.style.fontSize = getComputedStyle(el).fontSize;
    test.textContent = "#";
    document.body.appendChild(test);

    const charWidth = test.getBoundingClientRect().width;
    document.body.removeChild(test);

    const width = el.getBoundingClientRect().width;
    const count = Math.floor(width / charWidth) - 1;

    el.textContent = "#".repeat(Math.max(count, 0));
  });
}

window.addEventListener("load", updateHashDividers);
window.addEventListener("resize", updateHashDividers);
