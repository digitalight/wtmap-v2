'use client';

import React, { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface StreetViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  latitude: number;
  longitude: number;
  towerName: string;
}

const StreetViewModal: React.FC<StreetViewModalProps> = ({
  isOpen,
  onClose,
  latitude,
  longitude,
  towerName,
}) => {
  // Construct Google Street View embed URL
  const streetViewUrl = `https://www.google.com/maps/embed/v1/streetview?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&location=${latitude},${longitude}&heading=0&pitch=0&fov=90`;

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-50" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-end md:items-center justify-center p-0 md:p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-full md:translate-y-0 md:scale-95"
              enterTo="opacity-100 translate-y-0 md:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 md:scale-100"
              leaveTo="opacity-0 translate-y-full md:translate-y-0 md:scale-95"
            >
              <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-t-2xl md:rounded-2xl bg-white text-left align-middle shadow-xl transition-all max-h-[90vh] md:max-h-[85vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 md:p-6 border-b">
                  <Dialog.Title
                    as="h3"
                    className="text-base md:text-lg font-medium leading-6 text-gray-900 pr-8"
                  >
                    Street View: {towerName}
                  </Dialog.Title>
                  <button
                    type="button"
                    className="rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onClick={onClose}
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                {/* Street View Container */}
                <div className="flex-1 relative bg-gray-100">
                  {process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? (
                    <iframe
                      src={streetViewUrl}
                      className="w-full h-full min-h-[400px] md:min-h-[500px]"
                      style={{ border: 0 }}
                      allowFullScreen
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-64 p-6">
                      <div className="text-center">
                        <p className="text-gray-600 mb-4">
                          Street View requires a Google Maps API key.
                        </p>
                        <p className="text-sm text-gray-500">
                          Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to your .env.local file.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer with coordinates */}
                <div className="p-4 border-t bg-gray-50 text-xs md:text-sm text-gray-600">
                  <p>
                    📍 Coordinates: {latitude.toFixed(6)}, {longitude.toFixed(6)}
                  </p>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default StreetViewModal;
