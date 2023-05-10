import { useEffect, useState } from "react";

const usePreloadImages = (imageUrls) => {
  const [imagesLoaded, setImagesLoaded] = useState(false);

  useEffect(() => {
    console.log(imageUrls);

    const preloadImages = async () => {
      const promises = imageUrls.map((url) => {
        return new Promise((resolve) => {
          const img = new Image();
          img.src = url;
          img.onload = () => resolve(url);
          img.onerror = () => resolve(url);
        });
      });

      try {
        await Promise.all(promises);
        console.log("end guys");
        setImagesLoaded(true);
      } catch (error) {
        console.error("Error preloading images:", error);
      }
    };

    preloadImages();
  }, [imageUrls]);

  return imagesLoaded;
};

export default usePreloadImages;
