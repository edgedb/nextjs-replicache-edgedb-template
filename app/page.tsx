'use client'

import { useEffect, useState } from 'react';
import Cookies from "js-cookie";
import { nanoid } from "nanoid";
import { Replicache, TEST_LICENSE_KEY } from 'replicache';
import TodoList from '../lib/components/TodoList';
import { M, mutators } from '@/lib/mutators';
import { EdgeDB_Vercel } from '@/lib/components/Logo';

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
    <div className='h-full'>
      <nav
        className='px-8 pt-8'>
        <a className='contents' href='https://github.com/edgedb/nextjs-replicache-edgedb-template' target='_blank' rel="noopener noreferrer">
          <img src="/github.png" alt="GitHub" className="h-6 block ml-auto hover:scale-105 transform transition duration-300 ease-in-out" />
        </a>
      </nav>
      <main className='px-4 flex flex-col space-y-10 items-center h-full justify-center'>
        <div className="text-center justify-center flex flex-col items-center mx-auto lg:max-w-md ">
          <EdgeDB_Vercel />
          <h1 className="text-2xl font-bold tracking-tight sm:text-5xl py-2 mt-2
          bg-clip-text text-transparent bg-gradient-to-r from-[#259474] to-[#1A67FF]
          ">
            EdgeDB&nbsp;Replicache&nbsp;Template
          </h1>
          <p className="mt-4 text-base leading-7 text-gray-600">
            This is a starter template for building realtime, offline-first applications.
            It's a minimal todo app that demonstrates how to set up <a href="https://replicache.dev/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Replicache</a> with{' '}
            <a href="https://edgedb.com/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">EdgeDB</a>.
          </p>
        </div>
        <TodoList rep={rep} />
      </main>
    </div>
  );
};

export default HomePage;
