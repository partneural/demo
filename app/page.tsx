'use client';
import { useState, useEffect } from 'react';
import Map, { Marker } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
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
  // Fetch units to populate the units table
  const [units, setUnits] = useState<Unit[]>([]);

  const [viewport, setViewport] = useState({
    latitude: 40.39,
    longitude: -82.55,
    zoom: 10,
  });

  useEffect(() => {
    const fetchUnits = async () => {
      const res = await fetch('/api/units');
      const response = await res.json();
      console.log(response);
      setUnits(response.units);
    };

    fetchUnits();
  }, []);

  return (
    <main>
      <div className="flex h-screen w-full flex-col items-center space-y-10 bg-black">
        <div className="mt-4 flex w-5/6 flex-row">
          <span className="text-xl font-bold text-white">partneur.al</span>
        </div>
        <div className="flex h-3/4 w-full flex-row items-center justify-center space-x-2">
          <div className="h-full w-1/2 border-2 border-blue-500">
            <Map
              mapboxAccessToken={MAPBOX_TOKEN}
              initialViewState={viewport}
              mapStyle="mapbox://styles/mapbox/streets-v9"
            >
              {units.map((unit) => (
                <Marker
                  key={unit.id}
                  latitude={unit.latitude}
                  longitude={unit.longitude}
                >
                  <div className="rounded-full bg-green-500 p-2 text-white">
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
                  <th className="p-2 text-left">Status</th>
                  <th className="p-2 text-left">Latitude</th>
                  <th className="p-2 text-left">Longitude</th>
                </tr>
              </thead>
              <tbody>
                {units.map((unit) => (
                  <tr key={unit.id} className="border-b border-gray-600">
                    <td className="p-2">{unit.name}</td>
                    <td className="p-2">{unit.status}</td>
                    <td className="p-2">{unit.latitude}</td>
                    <td className="p-2">{unit.longitude}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="mt-4 flex w-5/6 flex-row justify-end">
          <button className="text-md bg-blue-500 p-2 font-bold text-white">
            simulate
          </button>
        </div>
      </div>
    </main>
  );
}
