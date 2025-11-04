export const getCurrentLocation = (): Promise<GeolocationCoordinates> => {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error("Geolocation is not supported by this browser."));
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                resolve(position.coords);
            },
            (error) => {
                reject(error);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0,
            }
        );
    });
};

export const watchLocation = (callback: (coords: GeolocationCoordinates) => void): void => {
    if (!navigator.geolocation) {
        console.error("Geolocation is not supported by this browser.");
        return;
    }

    navigator.geolocation.watchPosition(
        (position) => {
            callback(position.coords);
        },
        (error) => {
            console.error("Error watching location:", error);
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
        }
    );
};