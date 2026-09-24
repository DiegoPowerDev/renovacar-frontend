import Image from "next/image";
import ButtonTheme from "../buttons/buttonTheme";
import { Button } from "../ui/button";

export default function HomeHeader() {
  return (
    <div className="h-16 max-w-7xl w-full items-center flex p-4">
      <div className="flex gap-8 justify-between w-full">
        <div className="flex items-center justify-center overflow-hidden max-h-16">
          <Image
            src="/logo.webp"
            width={100}
            height={50}
            alt="logo"
            loading="eager"
            className="w-full h-full object-cover p-2 bg-white rounded-xl"
          />
        </div>
        <div className="flex gap-4 items-center">
          <ButtonTheme />
        </div>
      </div>
    </div>
  );
}
