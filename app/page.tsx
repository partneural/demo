'use client';
import { useState, useEffect } from 'react';
import Map, { Marker } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useRouter } from 'next/navigation';
import ClipLoader from 'react-spinners/ClipLoader';

const MAPBOX_TOKEN =
  'pk.eyJ1IjoidW1lcmhkZXIiLCJhIjoiY203Z3I5OHNzMTM3NTJrb29odDI0YjJjeiJ9.dmwWWljmyGK_MhrO1GzvqQ';

type Unit = {
  id: string;
  name: string;
  status: string;
  latitude: number;
  longitude: number;
  number: number;
};

export default function Page() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [time, setTime] = useState(0);
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [viewport, setViewport] = useState({
    latitude: 40.686067,
    longitude: -73.856608,
    zoom: 14,
  });

  // Add animation effect
  useEffect(() => {
    const interval = setInterval(() => {
      setTime((prev) => prev + 1);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  // Modify the units fetch effect
  useEffect(() => {
    const fetchUnits = async () => {
      const res = await fetch('/api/units');
      const response = await res.json();
      console.log(response);
      setUnits(response.units);
    };

    fetchUnits();
  }, []);

  // Calculate animated positions
  const getTriangularOffset = (t: number, seed: string) => {
    const amplitude = 0.000015; // Even smaller movement
    // Use the unit's ID to create very slow frequencies for smoother movement
    const frequency = parseInt(seed.slice(0, 3), 16) / 50000;
    const phase = parseInt(seed.slice(-3), 16);
    return amplitude * Math.sin((t + phase) * frequency);
  };

  const animatedUnits = units.map((unit) => ({
    ...unit,
    latitude: unit.latitude + getTriangularOffset(time, unit.id),
    longitude:
      unit.longitude +
      getTriangularOffset(time + 50, unit.id.split('').reverse().join('')),
  }));

  const handleSimulateClick = async () => {
    setLoading(true); // set loading state

    try {
      fetch('/api/simulate', {
        method: 'POST', // no headers or body since we're just using this to call a function
      });
    } catch (error) {
      console.error('POST request failed: ', error);
    } finally {
      setTimeout(() => {
        setLoading(false);
      }, 5000);
    }
  };

  return (
    <main>
      <div className="flex h-screen w-full flex-col items-center space-y-8 bg-black">
        <div className="mt-4 flex w-5/6 flex-row">
          <span className="text-xl font-bold text-white">partneur/al.</span>
        </div>
        <div className="flex w-5/6 flex-row items-start">
          <span className="text-5xl font-bold text-white">
            Command Dashboard
          </span>
        </div>
        <div className="flex h-3/4 w-full flex-row items-center justify-center space-x-2">
          <div className="h-full w-1/2 border-2 border-blue-500">
            <Map
              mapboxAccessToken={MAPBOX_TOKEN}
              initialViewState={viewport}
              mapStyle="mapbox://styles/mapbox/streets-v9"
            >
              {animatedUnits.map((unit) => (
                <Marker
                  key={unit.id}
                  latitude={unit.latitude}
                  longitude={unit.longitude}
                >
                  <div
                    className={`rounded-full p-2 ${
                      unit.status === 'standby'
                        ? 'bg-green-500 text-green-900'
                        : unit.status === 'inactive'
                          ? 'bg-gray-500 text-white'
                          : unit.status === 'warning'
                            ? 'bg-amber-500 text-white'
                            : 'bg-red-500 text-white'
                    } shadow-lg transition-transform duration-200 hover:scale-110`}
                  >
                    {unit.number}
                  </div>
                </Marker>
              ))}
            </Map>
          </div>
          <div className="h-full w-1/3 border border-white">
            <table className="w-full text-white">
              <thead>
                <tr className="border-b border-gray-600">
                  <th className="p-2 text-left">Name</th>
                  <th className="p-2 text-left">Number</th>
                  <th className="p-2 text-left">Status</th>
                  <th className="p-2 text-left">Latitude</th>
                  <th className="p-2 text-left">Longitude</th>
                </tr>
              </thead>
              <tbody>
                {units.map((unit) => (
                  <tr
                    key={unit.id}
                    className="cursor-pointer border-b border-gray-600 hover:bg-gray-600"
                    onClick={() => {
                      router.push(`/u/${unit.id}`);
                    }}
                  >
                    <td className="p-2">{unit.name}</td>
                    <td className="p-2">{unit.number}</td>
                    <td
                      className={`p-2 ${
                        unit.status === 'standby'
                          ? 'bg-green-500 text-green-900'
                          : 'bg-red-500'
                      } `}
                    >
                      {unit.status}
                    </td>
                    <td className="p-2">{unit.latitude}</td>
                    <td className="p-2">{unit.longitude}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="flex w-5/6 flex-row justify-end">
          <button
            className="text-md bg-blue-500 p-2 font-bold text-white"
            onClick={handleSimulateClick}
            disabled={loading}
          >
            <div className="flex flex-row items-center space-x-2">
              {loading && <ClipLoader color="#ffffff" size={15} />}
              <span className="">simulate</span>
            </div>
          </button>
        </div>
      </div>
    </main>
  );
}
