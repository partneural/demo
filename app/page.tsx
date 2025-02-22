import { useState, useEffect } from 'react';

type Unit = {
  id: string;
  name: string;
  status: string;
};

export default function Page() {
  // Fetch units to populate the units table
  // const [units, setUnits] = useState<Unit[]>([]);

  // useEffect(() => {
  //   const fetchUnits = async () => {
  //     const res = await fetch('/api/units');
  //     const response = await res.json();

  //     setUnits(response.units);
  //   };
  //   fetchUnits();
  // }, []);

  return (
    <main>
      <div className="flex h-screen w-full flex-col items-center bg-black">
        <div className="mt-4 flex w-3/4 flex-row">
          <span className="text-xl font-bold text-white">partneur.al</span>
        </div>
        <div className="h-screen w-full bg-blue-500"></div>
      </div>
    </main>
  );
}
