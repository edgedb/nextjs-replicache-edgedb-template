'use client'

import { M, MUTATORS_CLIENT } from '@/lib/mutators.client'
import Cookies from 'js-cookie'
import { nanoid } from 'nanoid'
import { useEffect, useState } from 'react'
import { Replicache, TEST_LICENSE_KEY } from 'replicache'

export default function useReplicache() {
  const [rep, setRep] = useState<Replicache<M> | null>(null)

  useEffect(() => {
    let userID = Cookies.get('userID')
    if (!userID) {
      userID = nanoid()
      Cookies.set('userID', userID)
    }

    const replicache = new Replicache({
      name: userID,
      licenseKey:
        process.env.NEXT_PUBLIC_REPLICACHE_LICENSE_KEY || TEST_LICENSE_KEY,
      pushURL: '/replicache/push',
      pullURL: '/replicache/pull',
      mutators: MUTATORS_CLIENT,
      schemaVersion: '1.0',

      // FOR DEBUGGING:
      // requestOptions: {
      //   minDelayMs: 5000, // long time during dev to allow for easier debugging
      // },
      // logLevel: 'debug',
    })

    setRep(replicache)

    return () => {
      void replicache.close()
    }
  }, [])

  return rep
}
