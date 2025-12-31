#
#  Copyright 2024 The InfiniFlow Authors. All Rights Reserved.
#
#  Licensed under the Apache License, Version 2.0 (the "License");
#  you may not use this file except in compliance with the License.
#  You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
#  Unless required by applicable law or agreed to in writing, software
#  distributed under the License is distributed on an "AS IS" BASIS,
#  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
#  See the License for the specific language governing permissions and
#  limitations under the License.
#
"""
Async utilities for running blocking operations without exhausting thread resources.

This module provides a bounded thread pool executor to prevent "can't start new thread"
errors when running many concurrent blocking operations via asyncio.
"""

import asyncio
import os
from concurrent.futures import ThreadPoolExecutor
from functools import partial
from typing import Any, Callable, TypeVar

T = TypeVar('T')

# Create a bounded thread pool executor
# Default to min(32, os.cpu_count() + 4) which is Python's default for ThreadPoolExecutor
# Can be overridden via RAGFLOW_THREAD_POOL_SIZE environment variable
_MAX_WORKERS = int(os.environ.get('RAGFLOW_THREAD_POOL_SIZE', min(32, (os.cpu_count() or 1) + 4)))
_executor: ThreadPoolExecutor | None = None


def get_executor() -> ThreadPoolExecutor:
    """Get or create the shared thread pool executor."""
    global _executor
    if _executor is None:
        _executor = ThreadPoolExecutor(max_workers=_MAX_WORKERS, thread_name_prefix="ragflow_async_")
    return _executor


def shutdown_executor():
    """Shutdown the thread pool executor gracefully."""
    global _executor
    if _executor is not None:
        _executor.shutdown(wait=False)
        _executor = None


async def run_in_thread(func: Callable[..., T], *args: Any, **kwargs: Any) -> T:
    """
    Run a blocking function in the bounded thread pool executor.
    
    This is a replacement for asyncio.to_thread() that uses a bounded thread pool
    to prevent "can't start new thread" errors under high load.
    
    Args:
        func: The blocking function to run
        *args: Positional arguments to pass to the function
        **kwargs: Keyword arguments to pass to the function
        
    Returns:
        The return value of the function
        
    Example:
        result = await run_in_thread(blocking_function, arg1, arg2, kwarg1=value)
    """
    loop = asyncio.get_running_loop()
    executor = get_executor()
    
    if kwargs:
        func = partial(func, **kwargs)
    
    return await loop.run_in_executor(executor, func, *args)
