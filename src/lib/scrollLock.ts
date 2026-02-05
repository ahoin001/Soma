let lockCount = 0;

const applyLock = () => {
  if (typeof document === "undefined") return;
  document.documentElement.classList.add("scroll-locked");
  document.body.style.overflow = "hidden";
  document.body.style.touchAction = "none";
};

const releaseLock = () => {
  if (typeof document === "undefined") return;
  document.documentElement.classList.remove("scroll-locked");
  document.body.style.overflow = "";
  document.body.style.touchAction = "";
};

export const lockScroll = () => {
  if (lockCount === 0) {
    applyLock();
  }
  lockCount += 1;
};

export const unlockScroll = () => {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) {
    releaseLock();
  }
};
