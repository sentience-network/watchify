"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ActivityCard } from "@/components/ActivityCard";
import { useWatchify } from "@/lib/store";

export default function SharedActivityPage() {
  const params = useParams<{ id: string }>();
  const { state } = useWatchify();
  const activity = state.activities.find((a) => a.id === params.id);

  return (
    <main className="mx-auto min-h-screen max-w-xl px-5 py-10">
      <p className="font-display text-2xl font-bold text-white">
        Watch<span className="text-teal">ify</span>
      </p>
      <h1 className="mt-6 font-display text-3xl font-bold text-white">
        Shared activity
      </h1>
      <div className="mt-6">
        {activity ? (
          <ActivityCard activity={activity} />
        ) : (
          <p className="text-mist">This activity could not be found.</p>
        )}
      </div>
      <Link
        href="/feed"
        className="mt-8 inline-flex rounded-xl bg-teal px-5 py-3 text-sm font-semibold text-ink hover:bg-teal-soft"
      >
        Open friend feed
      </Link>
    </main>
  );
}
