"use client";

import { useEffect } from "react";
import { digestOf, ErrorScreen } from "@/components/wait/ErrorScreen";

export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return <ErrorScreen digest={digestOf(error)} retry={retry} home />;
}
