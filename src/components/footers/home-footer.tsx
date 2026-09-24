export default function HomeFooter() {
  return (
    <div className="h-12 max-w-7xl w-full items-center  flex p-4">
      <div className="flex w-full justify-end">
        {process.env.NODE_ENV}
        <div>Website developed by Diego Torres</div>
        {process.env.API_URL}
      </div>
    </div>
  );
}
