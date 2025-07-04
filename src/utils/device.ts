const isMobile = () => {
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
  return /android|iphone|ipad|ipod|blackberry|windows phone/i.test(userAgent) ||
         (window.innerWidth <= 768 && window.innerHeight <= 1024); // Simple check for smaller screens
};

export default isMobile;
