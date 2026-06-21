import { Spinner } from "@/components/ui/spinner";

export default function Loading() {
    return (
        <div className='flex w-full h-full flex-col items-center justify-center gap-4'>
            <Spinner className='size-10' />
        </div>
    )
}