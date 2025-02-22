export default function Page({ params }: { params: { unitId: string } }) {
  return <div>Unit {params.unitId}</div>;
}
