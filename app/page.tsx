'use client'

import { useEffect, useState } from 'react';
import Cookies from "js-cookie";
import { nanoid } from "nanoid";
import { Replicache, TEST_LICENSE_KEY } from 'replicache';
import TodoList from '../lib/components/TodoList';
import { M, mutators } from '@/lib/mutators';

const HomePage = () => {
  const [rep, setRep] = useState<Replicache<M> | null>(null);

  useEffect(() => {
    let userID = Cookies.get("userID");
    if (!userID) {
      userID = nanoid();
      Cookies.set("userID", userID);
    }

    const replicache = new Replicache({
      name: userID,
      licenseKey: process.env.NEXT_PUBLIC_REPLICACHE_LICENSE_KEY || TEST_LICENSE_KEY,
      pushURL: '/api/push',
      pullURL: '/api/pull',
      mutators: mutators
    });

    setRep(replicache);

    return () => {
      void replicache.close();
    };
  }, [])

  if (!rep) {
    return <div>Loading...</div>;
  }

  return (
    <main className='flex items-center h-full justify-center'>
      <TodoList rep={rep} />
    </main>
  );
};

export default HomePage;
